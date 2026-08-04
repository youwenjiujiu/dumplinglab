/* Dumpling Lab — 3D dish viewer.
   Loads web/models/<id>.glb when present and renders it on a studio stage:
   soft key light, warm rim, contact shadow, slow auto-spin, drag to rotate,
   gyroscope parallax on mobile. Falls back to a procedural 3D dumpling so
   the interaction works before any real assets are generated.

   Usage:  const v = Dish3D.mount(container, { modelURL, glow });  v.dispose();
*/

import * as THREE from "three";
import { GLTFLoader } from "three/loaders/GLTFLoader.js";

const Dish3D = (() => {
  const loader = new GLTFLoader();
  const modelCache = new Map();

  function studioLights(scene) {
    scene.add(new THREE.AmbientLight(0xfff4e6, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd9a0, 1.1);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe8cc, 0.5);
    fill.position.set(2, -1, 3);
    scene.add(fill);
  }

  // A believable procedural dumpling: pleated crescent body from a lathe,
  // used until a real generated GLB exists.
  function proceduralDish(color = 0xecd9b0) {
    const group = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const r = Math.sin(t * Math.PI) * 0.9 + 0.05;
      pts.push(new THREE.Vector2(r, (t - 0.5) * 1.1));
    }
    const bodyGeo = new THREE.LatheGeometry(pts, 40);
    bodyGeo.scale(1, 0.62, 0.78);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.62, metalness: 0.02,
    });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);
    // Pleats along the crown
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 1.5;
      const pleat = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.7 })
      );
      pleat.position.set(Math.sin(a) * 0.5, 0.32, Math.cos(a) * 0.15);
      pleat.rotation.set(0.5, 0, a * 0.6);
      group.add(pleat);
    }
    return group;
  }

  function contactShadow() {
    const geo = new THREE.CircleGeometry(1.1, 48);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(20,10,4,0.5)");
    g.addColorStop(1, "rgba(20,10,4,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.85;
    mesh.scale.set(1.3, 1.3, 1.3);
    return mesh;
  }

  function frameObject(obj, camera) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);                       // center at origin
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.6 / maxDim;
    obj.scale.setScalar(scale);
    obj.position.multiplyScalar(scale);
  }

  function mount(container, opts = {}) {
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 4.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab;";

    studioLights(scene);
    scene.add(contactShadow());

    const pivot = new THREE.Group();
    scene.add(pivot);

    let disposed = false;
    const placeDish = obj => { frameObject(obj, camera); pivot.add(obj); };

    if (opts.modelURL) {
      const cached = modelCache.get(opts.modelURL);
      if (cached) {
        placeDish(cached.clone());
      } else {
        loader.load(opts.modelURL, gltf => {
          if (disposed) return;
          gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.envMapIntensity = 0.6; } });
          modelCache.set(opts.modelURL, gltf.scene);
          placeDish(gltf.scene.clone());
        }, undefined, () => { if (!disposed) placeDish(proceduralDish(opts.color)); });
      }
    } else {
      placeDish(proceduralDish(opts.color));
    }

    // Interaction: drag to rotate, inertia, slow idle spin, gyro parallax.
    let velX = 0, velY = 0, tX = 0, tY = 0, dragging = false, lastX = 0, lastY = 0, gx = 0, gy = 0;
    const el = renderer.domElement;
    const onDown = e => { dragging = true; el.style.cursor = "grabbing"; const p = e.touches ? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; velX = velY = 0; };
    const onMove = e => {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      velY = (p.clientX - lastX) * 0.01;
      velX = (p.clientY - lastY) * 0.01;
      tY += velY; tX += velX;
      tX = Math.max(-0.9, Math.min(0.9, tX));
      lastX = p.clientX; lastY = p.clientY;
    };
    const onUp = () => { dragging = false; el.style.cursor = "grab"; };
    el.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    const onOri = e => { gy = (e.gamma || 0) / 90 * 0.35; gx = ((e.beta || 0) - 45) / 90 * 0.2; };
    if (window.DeviceOrientationEvent) addEventListener("deviceorientation", onOri);

    const clock = new THREE.Clock();
    function loop() {
      if (disposed) return;
      requestAnimationFrame(loop);
      const dt = clock.getDelta();
      if (!dragging) { tY += 0.28 * dt; velY *= 0.94; velX *= 0.94; tY += velY; tX += velX; }
      const breathe = Math.sin(clock.elapsedTime * 0.9) * 0.03;
      pivot.rotation.y = tY + gy;
      pivot.rotation.x = tX * 0.6 + gx + breathe * 0.3;
      pivot.position.y = breathe;
      renderer.render(scene, camera);
    }
    loop();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    addEventListener("resize", onResize);

    return {
      dispose() {
        disposed = true;
        removeEventListener("pointermove", onMove);
        removeEventListener("pointerup", onUp);
        removeEventListener("deviceorientation", onOri);
        removeEventListener("resize", onResize);
        renderer.dispose();
        el.remove();
      },
    };
  }

  return { mount };
})();

export default Dish3D;
