import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

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
function makeStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const panel = (w, h, color, intensity, position, lookAt) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.position.copy(position);
    mesh.lookAt(lookAt);
    scene.add(mesh);
  };
  const origin = new THREE.Vector3();
  panel(6, 4, 0xffffff, 3.2, new THREE.Vector3(-3, 6, 4), origin);        // key softbox
  panel(8, 8, 0xfff8ef, 1.4, new THREE.Vector3(0, 8, 0), origin);         // ceiling
  panel(10, 6, 0xeef2ff, 0.9, new THREE.Vector3(6, 3, 2), origin);        // fill wall
  panel(10, 6, 0xffffff, 0.6, new THREE.Vector3(0, 3, -7), origin);       // back wall
  panel(14, 14, 0x777066, 0.5, new THREE.Vector3(0, -3, 0), new THREE.Vector3(0, 1, 0)); // floor
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return texture;
}

function prepareModel(root, preTilt = 0) {
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
  scene.add(shadow);

  let disposed = false;
  let root = null;
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

  const publish = () => {
    container.dataset.rotationX = pivot.rotation.x.toFixed(4);
    container.dataset.rotationY = pivot.rotation.y.toFixed(4);
    container.dataset.zoom = zoom.toFixed(3);
  };

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
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
      prepareModel(root, Number(options.preTilt) || 0);
      pivot.add(root);
      if (Number.isFinite(options.rotationY)) pivot.rotation.y = options.rotationY;
      if (Number.isFinite(options.rotationX)) pivot.rotation.x = clamp(options.rotationX, TILT_MIN, TILT_MAX);
      if (Number.isFinite(options.zoom)) { zoom = clamp(options.zoom, ZOOM_MIN, ZOOM_MAX); placeCamera(); }
      container.classList.add("model-loaded");
      container.dataset.source = "generated-glb";
      pivot.updateMatrixWorld(true);
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
      reset = { fromY: pivot.rotation.y, fromX: pivot.rotation.x, fromZoom: zoom, start: now };
      velocityX = velocityY = 0;
      lastTap = 0;
      wake();
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
      wake();   // let the flick coast out
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
