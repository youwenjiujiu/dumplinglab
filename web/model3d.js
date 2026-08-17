import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const clamp = THREE.MathUtils.clamp;

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

function prepareModel(root) {
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
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  camera.position.set(0, 2.35, 4.35);
  camera.lookAt(0, -0.08, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-label", options.label || "可触摸旋转的 3D 菜品");
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd7d7d7, 2.35);
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-3.5, 5.5, 4.8);
  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(4.5, 2.2, 2.4);
  scene.add(hemi, key, fill);

  const pivot = new THREE.Group();
  pivot.name = "generated-dish-pivot";
  scene.add(pivot);
  const shadow = makeContactShadow();
  scene.add(shadow);

  let disposed = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let root = null;
  let velocityX = 0;
  let velocityY = 0;
  let inertiaFrame = 0;

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
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
      prepareModel(root);
      pivot.add(root);
      container.classList.add("model-loaded");
      container.dataset.source = "generated-glb";
      container.dataset.rotationX = "0.0000";
      container.dataset.rotationY = "0.0000";
      render();
      options.onReady?.();
    },
    undefined,
    error => {
      if (!disposed) options.onError?.(error);
    },
  );

  const down = event => {
    if (!root) return;
    cancelAnimationFrame(inertiaFrame);
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };
  const move = event => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    velocityY = dx * 0.008;
    velocityX = dy * 0.0045;
    pivot.rotation.y += velocityY;
    pivot.rotation.x = clamp(pivot.rotation.x + velocityX, -0.42, 0.5);
    container.dataset.rotationX = pivot.rotation.x.toFixed(4);
    container.dataset.rotationY = pivot.rotation.y.toFixed(4);
    lastX = event.clientX;
    lastY = event.clientY;
    render();
  };
  const up = event => {
    dragging = false;
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    renderer.domElement.style.cursor = "grab";
    const coast = () => {
      if (disposed || dragging) return;
      velocityY *= 0.9;
      velocityX *= 0.84;
      if (Math.abs(velocityY) < 0.00035 && Math.abs(velocityX) < 0.00035) return;
      pivot.rotation.y += velocityY;
      pivot.rotation.x = clamp(pivot.rotation.x + velocityX, -0.42, 0.5);
      container.dataset.rotationX = pivot.rotation.x.toFixed(4);
      container.dataset.rotationY = pivot.rotation.y.toFixed(4);
      render();
      inertiaFrame = requestAnimationFrame(coast);
    };
    inertiaFrame = requestAnimationFrame(coast);
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", up);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(inertiaFrame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
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
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
