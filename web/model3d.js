import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { makeTable, makeStudioEnvironment } from "./table3d.js";

const clamp = THREE.MathUtils.clamp;

const HOME = { x: 0, y: 2.12, z: 3.92 };   // rest camera; a touch closer than the old framing
const TARGET_Y = -0.08;
const ZOOM_MIN = 0.72;   // closer than home
const ZOOM_MAX = 1.34;   // further out
const TILT_MIN = 0;      // never below the opening angle: a menu is read from above, and
                          // single-image models have nothing trustworthy under the rim
const TILT_MAX = 0.5;
const IDLE_SPIN = 0.14;  // rad/s — an invitation, slow enough to read the dish

function makeContactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(256, 80, 8, 256, 80, 238);
  gradient.addColorStop(0, "rgba(42,29,20,.20)");
  gradient.addColorStop(0.46, "rgba(42,29,20,.09)");
  gradient.addColorStop(1, "rgba(42,29,20,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.65, 0.9),
    new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadow.name = "dish-contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.79;
  return shadow;
}

/* The logo's seal is a true circle, so the dish turns inside one. The ring and
   its four registration ticks are DOM, not geometry: they stay hairline-crisp
   at any pixel ratio and cost nothing to draw. */
function makeStageTicks() {
  const ticks = document.createElement("div");
  ticks.className = "stage-ticks";
  ticks.setAttribute("aria-hidden", "true");
  for (const axis of ["v", "h"]) {
    const tick = document.createElement("span");
    tick.className = axis;
    ticks.appendChild(tick);
  }
  return ticks;
}

/* A small procedural softbox room baked to a PMREM: bright ceiling panel,
   dimmer walls, dark floor. Enough for believable reflections on glaze and
   broth without shipping an HDR file. */


/* ---------- photo projection ----------
   The photograph is the truth; the model only knows the other angles. At the
   rest pose the photo is projected back onto every surface that faced the
   camera when it was taken (and was not hidden behind something else, per a
   depth pass at that pose). Those surfaces show the real pixels; everything
   the photo never saw keeps the generated texture. Turning the dish reveals
   the generated sides gradually, and a double tap brings the photo back. */
const PROJ_KEY = "dl-photo-projection-5";

function makeProjection() {
  return {
    photoMap: { value: null },
    photoDepth: { value: null },
    photoMatrix: { value: new THREE.Matrix4() },
    photoCamObj: { value: new THREE.Vector3() },
    photoRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    photoStrength: { value: 0 },
  };
}

function installProjection(material, uniforms) {
  material.customProgramCacheKey = () => PROJ_KEY;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform mat4 photoMatrix;\nvarying vec4 vPhotoClip;\nvarying vec3 vObjPos;\nvarying vec3 vObjNormal;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvPhotoClip = photoMatrix * vec4(transformed, 1.0);\nvObjPos = transformed;\nvObjNormal = objectNormal;");
    const blend = `
      if (photoStrength > 0.0) {
        vec3 pndc = vPhotoClip.xyz / vPhotoClip.w;
        vec2 scr = pndc.xy * 0.5 + 0.5;
        vec2 puv = vec2((scr.x - photoRect.x) / photoRect.z, (scr.y - photoRect.y) / photoRect.w);
        float inside = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
        if (inside > 0.0) {
          vec4 ph = texture2D(photoMap, puv);
          float facing = dot(normalize(vObjNormal), normalize(photoCamObj - vObjPos));
          float seen = step(pndc.z * 0.5 + 0.5, texture2D(photoDepth, scr).r + 0.0004);
          float w = photoStrength * smoothstep(0.25, 0.85, ph.a) * smoothstep(0.4, 0.78, facing) * seen;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, ph.rgb, w);
        }
      }`;
    const decl = "uniform sampler2D photoMap;\nuniform sampler2D photoDepth;\nuniform vec3 photoCamObj;\nuniform vec4 photoRect;\nuniform float photoStrength;\nvarying vec4 vPhotoClip;\nvarying vec3 vObjPos;\nvarying vec3 vObjNormal;";
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\n" + decl);
    const hook = shader.fragmentShader.includes("#include <opaque_fragment>") ? "#include <opaque_fragment>" : "#include <output_fragment>";
    shader.fragmentShader = shader.fragmentShader.replace(hook, hook + blend);
  };
  material.needsUpdate = true;
}

function prepareModel(root, preTilt = 0, projection = null) {
  if (preTilt) root.rotation.x = preTilt;
  root.traverse(object => {
    if (!object.isMesh) return;
    const hasAuthoredNormals = Boolean(object.geometry.attributes.normal);
    if (!hasAuthoredNormals) object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    const authoredMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = authoredMaterials.map(material => {
      if (!material) return;
      // Older single-image generators bake the source lighting into one color
      // texture and export no normals. Lighting that texture again creates black
      // rims and dirty backs, so render it unlit. New PBR assets keep their
      // authored normals and materials.
      if (!hasAuthoredNormals && material.map) {
        const baked = new THREE.MeshBasicMaterial({
          map: material.map,
          color: material.color,
          transparent: material.transparent,
          opacity: material.opacity,
          alphaTest: material.alphaTest,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        material.dispose();
        return baked;
      }
      material.side = THREE.DoubleSide;
      if (material.isMeshStandardMaterial) {
        // Generated PBR maps overstate gloss; food and glaze are matte-ish.
        material.roughness = Math.max(material.roughness ?? 1, 0.62);
        material.metalness = 0;
        material.envMapIntensity = 0.7;
      }
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = 8;
      }
      material.needsUpdate = true;
      if (projection && material.isMeshStandardMaterial) installProjection(material, projection);
      return material;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  const initial = new THREE.Box3().setFromObject(root);
  const size = initial.getSize(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z, size.y * 1.2, 0.001);
  root.scale.setScalar(2.62 / footprint);
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y += -0.71 - fitted.min.y;
  root.updateMatrixWorld(true);
}

export function mountGeneratedDish3D(container, options = {}) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  let zoom = 1;
  const placeCamera = () => {
    camera.position.set(HOME.x * zoom, HOME.y * zoom, HOME.z * zoom);
    camera.lookAt(0, TARGET_Y, 0);
  };
  placeCamera();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral tone mapping keeps saturated food colours; ACES was greying the
  // orange out of the wontons.
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-label", options.label || "可触摸旋转的 3D 菜品");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
  container.appendChild(makeStageTicks());
  container.appendChild(renderer.domElement);

  /* Food photography lighting, not a lab: a soft studio environment gives
     glazed skins and broth their specular sheen (this is what "looks fresh"),
     a warm key from the upper left as in the restaurant's own photos, and a
     cool fill so shadows keep colour instead of going grey. */
  scene.environment = makeStudioEnvironment(renderer);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe4e2de, 1.35);
  const key = new THREE.DirectionalLight(0xfff6ec, 2.1);
  key.position.set(-3.2, 5.6, 4.6);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(4.6, 2.4, 2.2);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(0.5, 3.5, -4.5);
  scene.add(hemi, key, fill, rim);

  const pivot = new THREE.Group();
  pivot.name = "generated-dish-pivot";
  scene.add(pivot);
  const shadow = makeContactShadow();
  shadow.visible = options.contactShadow !== false;
  scene.add(shadow);
  const table = options.table ? makeTable(renderer, scene, options.table) : null;   // the restaurant's table under the dish

  let disposed = false;
  let root = null;
  const projection = options.photoURL ? makeProjection() : null;   // photo → surfaces that faced the camera
  let reflectionGroup = null;                                      // the dish mirrored in the table top
  let photoSize = null;                                            // natural size of the photograph
  let depthTarget = null;
  let dragging = false;
  let touched = false;               // has the guest ever taken hold of the dish
  let velocityX = 0;
  let velocityY = 0;
  // Presentation spin until first touch; renderers/QA pass idle:false and a
  // fixed pose so the captured frame is exactly the viewer's opening frame.
  let idle = options.idle === false ? false : !reduceMotion;
  let frame = 0;
  let lastTime = 0;
  let reset = null;                  // { fromY, fromX, fromZoom, start }
  const pointers = new Map();
  let pinchDistance = 0;
  let lastTap = 0;

  /* Screen-space box of the dish at its rest pose, in container pixels. The
     detail sheet uses it to fit the photograph exactly over the model so the
     photo → 3D hand-off changes depth, not size. */
  const screenBox = () => {
    if (!root) return null;
    // Project a sample of real vertices: a bounding box's corners sit outside a
    // round bowl and would overstate its width under perspective.
    const width = renderer.domElement.clientWidth, height = renderer.domElement.clientHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const v = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse(object => {
      if (!object.isMesh) return;
      const position = object.geometry.attributes.position;
      const stride = Math.max(1, Math.floor(position.count / 3000));
      for (let i = 0; i < position.count; i += stride) {
        v.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).project(camera);
        const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    });
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  };

  // How far the dish has been turned away from the photograph's angle (radians).
  const turnNow = () => Math.hypot(Math.atan2(Math.sin(pivot.rotation.y), Math.cos(pivot.rotation.y)), pivot.rotation.x * 1.6);
  // Put the dish back the way it was served (double tap, or a small turn let go).
  const startReset = () => { reset = { fromY: pivot.rotation.y, fromX: pivot.rotation.x, fromZoom: zoom, start: performance.now() }; velocityX = velocityY = 0; wake(); };
  const publish = () => {
    container.dataset.rotationX = pivot.rotation.x.toFixed(4);
    container.dataset.rotationY = pivot.rotation.y.toFixed(4);
    container.dataset.zoom = zoom.toFixed(3);
    const turn = turnNow();
    if (projection) {
      // The projected photo holds for the first stretch of a turn, then lets go of the sides it never saw.
      const ready = projection.photoMap.value && projection.photoDepth.value ? 1 : 0;
      projection.photoStrength.value = ready * (1 - THREE.MathUtils.smoothstep(turn, 0.15, 0.45));
    }
    options.onPose?.({ turn, rotationY: pivot.rotation.y, rotationX: pivot.rotation.x, zoom });
  };

  /* Rest-pose mapping: where each surface point landed in the photograph, and
     a depth pass so surfaces hidden at that pose do not borrow its pixels. */
  const updateProjection = () => {
    if (!projection || !root || !photoSize) return;
    const savedY = pivot.rotation.y, savedX = pivot.rotation.x, savedZoom = zoom;
    pivot.rotation.set(0, 0, 0); zoom = 1; placeCamera();
    pivot.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const width = renderer.domElement.clientWidth, height = renderer.domElement.clientHeight;
    const box = screenBox();
    const photoHeight = box.width * photoSize.height / photoSize.width;
    const centreUp = 1 - (box.top + box.height / 2) / height;
    projection.photoRect.value.set(box.left / width, centreUp - photoHeight / height / 2, box.width / width, photoHeight / height);
    const viewProj = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    root.traverse(object => {
      if (!object.isMesh) return;
      projection.photoMatrix.value.multiplyMatrices(viewProj, object.matrixWorld);
      projection.photoCamObj.value.copy(camera.position).applyMatrix4(object.matrixWorld.clone().invert());
    });
    const dpr = renderer.getPixelRatio(), w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    if (!depthTarget || depthTarget.width !== w || depthTarget.height !== h) {
      depthTarget?.dispose();
      depthTarget = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType), depthBuffer: true });
    }
    const strength = projection.photoStrength.value; projection.photoStrength.value = 0;
    const shadowWas = shadow.visible; shadow.visible = false; if (reflectionGroup) reflectionGroup.visible = false; if (table) table.group.visible = false;
    renderer.setRenderTarget(depthTarget); renderer.render(scene, camera); renderer.setRenderTarget(null);
    shadow.visible = shadowWas; if (reflectionGroup) reflectionGroup.visible = true; if (table) table.group.visible = true;
    projection.photoDepth.value = depthTarget.depthTexture;
    projection.photoStrength.value = strength;
    pivot.rotation.set(savedX, savedY, 0); zoom = savedZoom; placeCamera(); pivot.updateMatrixWorld(true);
    publish();
  };
  if (projection) {
    new THREE.TextureLoader().load(options.photoURL, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      photoSize = { width: texture.image.width, height: texture.image.height };
      projection.photoMap.value = texture;
      updateProjection(); render();
    });
  }

  // At rest the sheet shows the photograph on top; the model is then hidden in the main
  // pass but still reflected in the table, so the photograph appears to stand on it.
  let dishVisible = true;
  const render = () => {
    if (disposed) return;
    if (root) root.visible = true;
    table?.beforeRender(camera);
    if (root) root.visible = dishVisible;
    renderer.render(scene, camera);
  };

  /* One loop drives idle spin, flick inertia and the reset animation; it parks
     itself the moment nothing is moving, so a still dish costs no frames. */
  const running = () => idle || dragging || reset
    || Math.abs(velocityY) > 0.00035 || Math.abs(velocityX) > 0.00035;

  const tick = now => {
    if (disposed) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;

    if (reset) {
      const t = clamp((now - reset.start) / 480, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      pivot.rotation.y = reset.fromY * (1 - eased);
      pivot.rotation.x = reset.fromX * (1 - eased);
      zoom = reset.fromZoom + (1 - reset.fromZoom) * eased;
      placeCamera();
      if (t >= 1) reset = null;
    } else if (idle) {
      pivot.rotation.y += IDLE_SPIN * delta;
    } else if (!dragging) {
      velocityY *= 0.9;
      velocityX *= 0.84;
      pivot.rotation.y += velocityY;
      pivot.rotation.x = clamp(pivot.rotation.x + velocityX, TILT_MIN, TILT_MAX);
    }

    publish();
    render();
    frame = running() ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => {
    if (!disposed && !frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth || 360);
    const height = Math.max(1, container.clientHeight || 300);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    updateProjection();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  loader.load(
    options.modelURL,
    gltf => {
      if (disposed) return;
      root = gltf.scene;
      prepareModel(root, Number(options.preTilt) || 0, projection);
      pivot.add(root);
      if (options.reflection) {
        // A planar reflection in the table: the same dish mirrored through the floor plane (y = -0.71),
        // drawn translucent; the sheet fades it with distance from the base with a mask.
        const ghost = root.clone(true);
        ghost.traverse(object => {
          if (!object.isMesh) return;
          const from = Array.isArray(object.material) ? object.material[0] : object.material;
          object.material = new THREE.MeshStandardMaterial({ map: from?.map || null, color: from?.color ? from.color.clone() : new THREE.Color(0xffffff), roughness: 1, metalness: 0, transparent: true, opacity: options.reflection.opacity ?? 0.32, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.3 });
          object.renderOrder = 1;
        });
        reflectionGroup = new THREE.Group();
        reflectionGroup.position.y = -1.42;
        reflectionGroup.scale.y = -1;
        reflectionGroup.add(ghost);
        pivot.add(reflectionGroup);
      }
      if (Number.isFinite(options.rotationY)) pivot.rotation.y = options.rotationY;
      if (Number.isFinite(options.rotationX)) pivot.rotation.x = clamp(options.rotationX, TILT_MIN, TILT_MAX);
      if (Number.isFinite(options.zoom)) { zoom = clamp(options.zoom, ZOOM_MIN, ZOOM_MAX); placeCamera(); }
      container.classList.add("model-loaded");
      container.dataset.source = "generated-glb";
      pivot.updateMatrixWorld(true);
      updateProjection();
      publish();
      render();
      options.onReady?.(screenBox());
      wake();
    },
    undefined,
    error => {
      if (!disposed) options.onError?.(error);
    },
  );

  const setZoom = next => {
    zoom = clamp(next, ZOOM_MIN, ZOOM_MAX);
    placeCamera();
    publish();
    render();
  };

  const down = event => {
    if (!root) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    renderer.domElement.setPointerCapture?.(event.pointerId);

    // Taking hold retires the presentation spin and the on-screen hint.
    idle = false;
    reset = null;
    if (!touched) {
      touched = true;
      container.dataset.touched = "1";
      container.closest(".d-pic")?.classList.add("touched");
      options.onFirstTouch?.();
    }

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      dragging = false;
      return;
    }

    // A double tap puts the dish back the way it was served.
    const now = performance.now();
    if (now - lastTap < 300) {
      startReset();
      lastTap = 0;
      return;
    }
    lastTap = now;

    dragging = true;
    velocityX = velocityY = 0;
    renderer.domElement.style.cursor = "grabbing";
  };

  const move = event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) setZoom(zoom * (pinchDistance / distance));
      pinchDistance = distance;
      return;
    }
    if (!dragging) return;

    velocityY = (event.clientX - previous.x) * 0.008;
    velocityX = (event.clientY - previous.y) * 0.0045;
    pivot.rotation.y += velocityY;
    pivot.rotation.x = clamp(pivot.rotation.x + velocityX, TILT_MIN, TILT_MAX);
    publish();
    render();
  };

  const up = event => {
    pointers.delete(event.pointerId);
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 0) {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      // A small turn let go springs back to the photograph; a real turn coasts out and stays.
      if (options.snapBack && turnNow() + Math.abs(velocityY) * 10 < options.snapBack) startReset();
      else wake();   // let the flick coast out
    }
  };

  const wheel = event => {
    if (!root) return;
    event.preventDefault();
    idle = false;
    setZoom(zoom * (1 + event.deltaY * 0.0012));
  };

  const element = renderer.domElement;
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", up);
  element.addEventListener("wheel", wheel, { passive: false });

  return {
    reset: startReset,
    setDishVisible(visible) { dishVisible = Boolean(visible); render(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("wheel", wheel);
      root?.traverse(object => {
        if (!object.isMesh) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          material?.map?.dispose();
          material?.dispose();
        });
      });
      reflectionGroup?.traverse(object => { if (object.isMesh) object.material?.dispose(); });
      table?.dispose();
      projection?.photoMap.value?.dispose();
      depthTarget?.dispose();
      shadow.geometry.dispose();
      shadow.material.map.dispose();
      shadow.material.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      element.remove();
      container.querySelector(".stage-ticks")?.remove();
    },
  };
}
