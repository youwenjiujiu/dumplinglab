import * as THREE from "./vendor/three.module.js";

const clamp = THREE.MathUtils.clamp;

function makePhotoGeometry(image) {
  const aspect = image.naturalWidth / image.naturalHeight;
  const geometry = new THREE.PlaneGeometry(aspect * 2, 2, 72, 52);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let index = 0; index < position.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    const x = u * 2 - 1;
    const y = v * 2 - 1;
    // Smooth support only: no luminance-to-depth conversion and therefore no
    // invented dumplings, rippled plates, or changed pixels at the front view.
    const radial = Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y);
    const depth = 0.035 + radial * 0.19;
    position.setZ(index, depth);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function makeShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 48, 4, 128, 48, 112);
  gradient.addColorStop(0, "rgba(38,25,18,.22)");
  gradient.addColorStop(0.5, "rgba(38,25,18,.09)");
  gradient.addColorStop(1, "rgba(38,25,18,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  sprite.name = "photo-contact-shadow";
  sprite.position.set(0, -1.03, -0.16);
  sprite.scale.set(2.55, 0.58, 1);
  return sprite;
}

export function mountPhotoDepth3D(container, options = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-label", options.label || "可触摸旋转的照片 3D 菜品");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
  container.appendChild(renderer.domElement);

  const pivot = new THREE.Group();
  pivot.name = "photo-depth-pivot";
  pivot.rotation.set(0, 0, 0);
  scene.add(pivot);

  let disposed = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let texture = null;
  let dish = null;
  let shadow = null;
  let imageAspect = 1;

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };
  const resize = () => {
    const width = Math.max(1, container.clientWidth || 360);
    const height = Math.max(1, container.clientHeight || 300);
    const viewportAspect = width / height;
    const halfHeight = imageAspect > viewportAspect ? imageAspect / viewportAspect : 1;
    camera.left = -halfHeight * viewportAspect;
    camera.right = halfHeight * viewportAspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
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
    imageAspect = image.naturalWidth / image.naturalHeight;
    texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    dish = new THREE.Mesh(
      makePhotoGeometry(image),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0,
        alphaToCoverage: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    dish.name = "real-photo-depth-mesh";
    pivot.add(dish);
    shadow = makeShadow();
    pivot.add(shadow);
    render();
    container.classList.add("model-loaded");
    container.dataset.source = "original-photo";
    container.dataset.image = options.imageURL;
    container.dataset.rotationX = "0.0000";
    container.dataset.rotationY = "0.0000";
    resize();
    options.onReady?.();
  };
  image.onerror = () => !disposed && options.onError?.();
  image.src = options.imageURL;

  const down = event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };
  const rotateBy = (dx, dy) => {
    pivot.rotation.y = clamp(pivot.rotation.y + dx * 0.0032, -0.20, 0.20);
    pivot.rotation.x = clamp(pivot.rotation.x + dy * 0.0025, -0.10, 0.10);
    container.dataset.rotationX = pivot.rotation.x.toFixed(4);
    container.dataset.rotationY = pivot.rotation.y.toFixed(4);
    render();
  };
  const move = event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    rotateBy(dx, dy);
    lastX = event.clientX;
    lastY = event.clientY;
  };
  const up = event => {
    dragging = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grab";
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", up);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      dish?.geometry.dispose();
      dish?.material.dispose();
      shadow?.material.map?.dispose();
      shadow?.material.dispose();
      texture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
