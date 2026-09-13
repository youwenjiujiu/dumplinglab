import * as THREE from "./vendor/three.module.js";
import { makeTable, makeStudioEnvironment, TABLE_TOP } from "./table3d.js";

/* A photographed dish, standing on the table.
   The photograph is the truth, so it is never re-drawn: it stands as a
   card on the table top, facing the camera at the same angle the food was
   shot from, with a shallow relief so a small tilt reads as depth. The
   camera is the same eye as the model viewer, so photographed and modelled
   dishes sit on the same table at the same size. */

const clamp = THREE.MathUtils.clamp;
const HOME = { x: 0, y: 2.12, z: 3.92 };   // the model viewer's rest camera
const TARGET_Y = -0.08;
const FOOTPRINT = 2.62;                    // a dish's width in scene units, like the models

function makePhotoGeometry(image) {
  const aspect = image.naturalWidth / image.naturalHeight;
  const geometry = new THREE.PlaneGeometry(aspect * 2, 2, 72, 52);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index += 1) {
    const u = uv.getX(index), v = uv.getY(index);
    const x = u * 2 - 1, y = v * 2 - 1;
    // Smooth support only: no luminance-to-depth conversion, no invented pixels.
    const radial = Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y);
    position.setZ(index, 0.035 + radial * 0.19);
    position.setY(index, position.getY(index) + 1);   // stand on its bottom edge
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/* The shadow the dish casts on whatever it stands on: a soft ellipse lying
   flat on the ground, not a card facing the camera. */
function makeShadow(colour = "40,32,22") {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 6, 128, 128, 126);
  gradient.addColorStop(0, `rgba(${colour},.26)`);
  gradient.addColorStop(0.4, `rgba(${colour},.08)`);
  gradient.addColorStop(1, `rgba(${colour},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = "photo-contact-shadow";
  return mesh;
}

function makeSheen() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.05, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sprite.name = "photo-sheen";
  return sprite;
}

function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe4e2de, 1.35);
  const key = new THREE.DirectionalLight(0xfff6ec, 2.1); key.position.set(-3.2, 5.6, 4.6);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(4.6, 2.4, 2.2);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(0.5, 3.5, -4.5);
  scene.add(hemi, key, fill, rim);
}

export function mountPhotoDepth3D(container, options = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  const zoom = options.zoom || 1.3;
  camera.position.set(HOME.x * zoom, HOME.y * zoom, HOME.z * zoom);
  camera.lookAt(0, TARGET_Y, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-label", options.label || "可触摸的照片菜品");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
  container.appendChild(renderer.domElement);

  addLights(scene);
  if (options.table) scene.environment = makeStudioEnvironment(renderer);
  const table = options.table ? makeTable(renderer, scene, options.table) : null;

  // pivot stands on the table and faces the camera; tilt turns the card in the hand
  const pivot = new THREE.Group();
  pivot.position.set(0, TABLE_TOP, 0.1);
  pivot.lookAt(camera.position);
  scene.add(pivot);
  const tilt = new THREE.Group();
  pivot.add(tilt);

  let disposed = false, dragging = false, touched = false, moved = 0, downAt = 0;
  let lastX = 0, lastY = 0;
  let texture = null, dish = null, shadow = null, sheen = null;
  let frame = 0;
  let scale = 1;

  const TILT_Y = 0.30, TILT_X = 0.16;

  const render = () => {
    if (disposed) return;
    table?.beforeRender(camera);
    renderer.render(scene, camera);
  };
  const publish = () => {
    container.dataset.rotationX = tilt.rotation.x.toFixed(4);
    container.dataset.rotationY = tilt.rotation.y.toFixed(4);
    if (sheen) {
      sheen.position.x = -tilt.rotation.y * 2.2 * scale;
      sheen.position.y = (1.35 + tilt.rotation.x * 2.4) * scale;
      sheen.material.opacity = 0.05 + Math.min(0.11, Math.hypot(tilt.rotation.x, tilt.rotation.y) * 0.5);
    }
  };
  const settle = () => {
    if (disposed || dragging) return;
    tilt.rotation.x *= 0.82; tilt.rotation.y *= 0.82;
    if (Math.abs(tilt.rotation.x) < 0.0006 && Math.abs(tilt.rotation.y) < 0.0006) {
      tilt.rotation.set(0, 0, 0); publish(); render(); frame = 0; return;
    }
    publish(); render();
    frame = requestAnimationFrame(settle);
  };

  /* Screen-space box of the standing photograph, in container pixels. */
  const screenBox = () => {
    if (!dish) return null;
    const width = renderer.domElement.clientWidth, height = renderer.domElement.clientHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const v = new THREE.Vector3();
    dish.updateMatrixWorld(true);
    const half = dish.geometry.parameters.width / 2;
    for (const [x, y] of [[-half, 0], [half, 0], [-half, 2], [half, 2]]) {
      v.set(x, y, 0.1).applyMatrix4(dish.matrixWorld).project(camera);
      const sx = (v.x + 1) / 2 * width, sy = (1 - v.y) / 2 * height;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
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

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (disposed) return;
    texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    const aspect = image.naturalWidth / image.naturalHeight;
    scale = FOOTPRINT / (aspect * 2);
    // With no table under it the dish should sit in the middle of the frame,
    // not stand on a floor that is not drawn: centre the card on the camera's target.
    if (!options.table) pivot.position.y = TARGET_Y - scale;
    dish = new THREE.Mesh(makePhotoGeometry(image), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.45, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    dish.name = "real-photo-depth-mesh";
    dish.scale.setScalar(scale);
    tilt.add(dish);
    shadow = makeShadow(options.table ? "20,0,0" : "40,32,22");
    shadow.position.set(0, pivot.position.y + 0.004, 0.06);
    shadow.scale.set(FOOTPRINT * 0.78, FOOTPRINT * 0.5, 1);
    scene.add(shadow);
    sheen = makeSheen();
    sheen.scale.set(1.9 * scale, 1.3 * scale, 1);
    sheen.position.set(0, 1.35 * scale, 0.3);
    tilt.add(sheen);
    publish();
    render();
    container.classList.add("model-loaded");
    container.dataset.source = "original-photo";
    container.dataset.image = options.imageURL;
    resize();
    options.onReady?.(screenBox());
  };
  image.onerror = () => !disposed && options.onError?.();
  image.src = options.imageURL;

  const down = event => {
    if (!dish) return;
    cancelAnimationFrame(frame); frame = 0;
    dragging = true; moved = 0; downAt = performance.now();
    lastX = event.clientX; lastY = event.clientY;
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
    if (!touched) {
      touched = true;
      container.dataset.touched = "1";
      container.closest(".d-pic")?.classList.add("touched");
      options.onFirstTouch?.();
    }
  };
  const move = event => {
    if (!dragging) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    tilt.rotation.y = clamp(tilt.rotation.y + dx * 0.0042, -TILT_Y, TILT_Y);
    tilt.rotation.x = clamp(tilt.rotation.x + dy * 0.0032, -TILT_X, TILT_X);
    lastX = event.clientX; lastY = event.clientY;
    publish(); render();
  };
  const up = event => {
    if (!dragging) return;
    dragging = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grab";
    if (moved < 6 && performance.now() - downAt < 350) options.onTap?.();
    if (!frame) frame = requestAnimationFrame(settle);
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", up);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      dish?.geometry.dispose(); dish?.material.dispose();
      shadow?.material.map?.dispose(); shadow?.material.dispose();
      sheen?.material.map?.dispose(); sheen?.material.dispose();
      texture?.dispose();
      table?.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
