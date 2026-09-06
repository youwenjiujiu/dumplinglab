import * as THREE from "/vendor/three.module.js";

// A real, procedural steamer. Menu photographs remain photographs, not fake scans.
export function plateLayout(count) {
  return Array.from({ length: Math.min(count, 6) }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    return { x: Math.cos(angle) * 2.05, z: Math.sin(angle) * 1.85 };
  });
}

export function buildSteamer() {
  const root = new THREE.Group(),
    lid = new THREE.Group();
  const bamboo = new THREE.MeshStandardMaterial({
    color: 0xd5b58a,
    roughness: 0.78,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: 0xad7b51,
    roughness: 0.85,
  });
  const pale = new THREE.MeshStandardMaterial({
    color: 0xe9d1aa,
    roughness: 0.9,
  });
  const dough = new THREE.MeshStandardMaterial({
    color: 0xf5e9cd,
    roughness: 0.64,
  });
  const mesh = (geometry, material, parent = root) => {
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const ring = (radius, tube, y, material, parent = root) => {
    const r = mesh(
      new THREE.TorusGeometry(radius, tube, 8, 80),
      material,
      parent,
    );
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    return r;
  };
  // Thin lathed wall, open at the top, rather than a solid cylinder.
  mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.91, 0.05),
        new THREE.Vector2(0.94, 0.08),
        new THREE.Vector2(0.94, 0.49),
        new THREE.Vector2(0.9, 0.49),
        new THREE.Vector2(0.9, 0.08),
        new THREE.Vector2(0.91, 0.05),
      ],
      80,
    ),
    bamboo,
  );
  ring(0.925, 0.026, 0.09, edge);
  ring(0.925, 0.029, 0.46, edge);
  ring(0.924, 0.012, 0.23, pale);
  ring(0.924, 0.012, 0.33, pale);
  const floor = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.045, 64), pale);
  floor.position.y = 0.095;
  for (let i = -7; i <= 7; i++) {
    const x = i * 0.115,
      length = 2 * Math.sqrt(0.86 ** 2 - x ** 2);
    const slat = mesh(new THREE.BoxGeometry(0.068, 0.016, length), bamboo);
    slat.position.set(x, 0.13, 0);
  }
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const seam = mesh(new THREE.BoxGeometry(0.012, 0.27, 0.007), edge);
    seam.position.set(Math.sin(a) * 0.942, 0.28, Math.cos(a) * 0.942);
    seam.rotation.y = a;
  }
  // Crescent bodies with a hand-pinched, scalloped seam.
  const body = new THREE.SphereGeometry(1, 28, 18);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    p.setXYZ(i, x * 0.29, 0.17 + y * 0.155, z * 0.125 + 0.06 * (1 - x * x));
  }
  body.computeVertexNormals();
  for (let i = 0; i < 5; i++) {
    const dumpling = new THREE.Group(),
      a = (i * Math.PI * 2) / 5;
    dumpling.position.set(Math.cos(a) * 0.49, 0.14, Math.sin(a) * 0.49);
    dumpling.rotation.y = -a + Math.PI / 2;
    root.add(dumpling);
    mesh(body, dough, dumpling);
    const points = Array.from({ length: 33 }, (_, j) => {
      const t = j / 32,
        x = (t * 2 - 1) * 0.275;
      return new THREE.Vector3(
        x,
        0.17 + Math.sin(t * Math.PI) * 0.15,
        0.06 * (1 - (x / 0.29) ** 2) + Math.sin(t * Math.PI * 18) * 0.019,
      );
    });
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        64,
        0.017,
        6,
        false,
      ),
      dough,
      dumpling,
    );
  }
  root.add(lid);
  lid.position.y = 0.52;
  const top = mesh(
    new THREE.CylinderGeometry(0.97, 0.97, 0.045, 80),
    bamboo,
    lid,
  );
  top.position.y = 0.02;
  // Actual interlaced strips; alternating heights make the weave catch the light.
  for (let i = -8; i <= 8; i++) {
    const offset = i * 0.105,
      length = 2 * Math.sqrt(0.91 ** 2 - offset ** 2);
    for (let axis = 0; axis < 2; axis++) {
      const slat = mesh(
        new THREE.BoxGeometry(0.052, 0.012, length),
        (i + axis) % 2 ? pale : bamboo,
        lid,
      );
      slat.position.set(
        axis ? 0 : offset,
        0.05 + axis * 0.014,
        axis ? offset : 0,
      );
      slat.rotation.y = (axis * Math.PI) / 2;
    }
  }
  ring(0.956, 0.032, 0.06, edge, lid);
  ring(0.91, 0.012, 0.071, pale, lid);
  const handle = mesh(
    new THREE.TorusGeometry(0.15, 0.031, 8, 32, Math.PI),
    edge,
    lid,
  );
  handle.position.y = 0.082;
  root.name = "handwoven-steamer";
  lid.name = "liftable-lid";
  return { root, lid };
}

export function mountTableScene(host, { onDish, onError, label }) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", label);
  canvas.setAttribute("role", "img");
  host.append(canvas);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 35);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xfff6e5, 0x733d30, 2.1));
  const light = new THREE.DirectionalLight(0xfff1da, 3.1);
  light.position.set(-3, 7, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -4,
    right: 4,
    top: 4,
    bottom: -4,
  });
  light.shadow.bias = -0.001;
  light.shadow.normalBias = 0.025;
  scene.add(light);
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(3.05, 3.03, 0.14, 96),
    new THREE.MeshStandardMaterial({ color: 0x984c3c, roughness: 0.86 }),
  );
  table.position.y = -0.1;
  table.receiveShadow = true;
  world.add(table);
  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(3.04, 0.025, 8, 96),
    new THREE.MeshStandardMaterial({ color: 0xad6850, roughness: 0.75 }),
  );
  edge.rotation.x = Math.PI / 2;
  edge.position.y = -0.024;
  world.add(edge);
  const { root, lid } = buildSteamer();
  world.add(root);
  const steam = new THREE.Group();
  root.add(steam);
  const steamMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff5df,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 18 }, (_, j) => {
        const t = j / 17;
        return new THREE.Vector3(
          (i - 1) * 0.3 + Math.sin(t * 6 + i) * 0.075,
          0.46 + t * 0.75,
          Math.cos(t * 5 + i) * 0.08,
        );
      }),
    );
    steam.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.011, 5, false),
        steamMaterial,
      ),
    );
  }
  // A folded paper napkin and chopsticks anchor the scene in a dumpling shop.
  const napkin = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.015, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xf3e7d1, roughness: 1 }),
  );
  napkin.position.set(1.36, 0.012, 0.1);
  napkin.rotation.y = -0.22;
  napkin.receiveShadow = true;
  world.add(napkin);
  const wood = new THREE.MeshStandardMaterial({
    color: 0x7f4930,
    roughness: 0.6,
  });
  for (let i = 0; i < 2; i++) {
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.035, 1.63, 8),
      wood,
    );
    stick.rotation.set(Math.PI / 2, 0, -0.22);
    stick.position.set(1.3 + i * 0.14, 0.063, 0.05);
    stick.castShadow = true;
    world.add(stick);
  }
  const photos = new THREE.Group();
  world.add(photos);
  const loader = new THREE.TextureLoader(),
    cache = new Map();
  let disposed = false,
    frame = 0,
    opened = false,
    lidProgress = 0;
  let heading = -0.13,
    targetHeading = -0.13,
    elevation = 0.83,
    targetElevation = 0.83;
  let distance = 9.7,
    targetDistance = 9.7,
    dragging = null,
    last = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const ray = new THREE.Raycaster(),
    point = new THREE.Vector2();
  function paint(now = performance.now()) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-dt * 9);
    heading += (targetHeading - heading) * ease;
    elevation += (targetElevation - elevation) * ease;
    distance += (targetDistance - distance) * ease;
    lidProgress += ((opened ? 1 : 0) - lidProgress) * ease;
    // The lid slides to the back, so it never hides the dumplings beneath it.
    lid.position.set(
      -0.88 * lidProgress,
      0.52 + lidProgress * 0.75,
      -0.45 * lidProgress,
    );
    lid.rotation.set(-0.32 * lidProgress, 0, -0.48 * lidProgress);
    steamMaterial.opacity = lidProgress * 0.12;
    world.rotation.y = heading;
    const fit = camera.aspect < 1 ? 1 / Math.pow(camera.aspect, 0.62) : 1;
    camera.position.set(
      0,
      Math.sin(elevation) * distance * fit,
      Math.cos(elevation) * distance * fit,
    );
    camera.lookAt(0, 0.05, 0);
    let arriving = false;
    photos.children.forEach((sprite) => {
      const progress = reduced.matches
        ? 1
        : Math.min(1, (now - sprite.userData.arrivedAt) / 500);
      const eased = 1 - Math.pow(1 - progress, 3);
      sprite.scale.setScalar(1.22 * (0.82 + 0.18 * eased));
      sprite.position.y = 0.48 + (1 - eased) * 0.35;
      sprite.material.opacity = eased;
      if (progress < 1) arriving = true;
    });
    renderer.render(scene, camera);
    if (
      Math.abs(targetHeading - heading) +
        Math.abs(targetElevation - elevation) +
        Math.abs(targetDistance - distance) +
        Math.abs((opened ? 1 : 0) - lidProgress) >
        0.001 ||
      arriving
    )
      invalidate();
  }
  function invalidate() {
    if (!disposed && !frame && !document.hidden)
      frame = requestAnimationFrame(paint);
  }
  const resize = new ResizeObserver(() => {
    if (disposed) return;
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  });
  resize.observe(host);
  const visibility = () => {
    last = 0;
    invalidate();
  };
  document.addEventListener("visibilitychange", visibility);
  const contextLost = (e) => {
    e.preventDefault();
    onError();
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("pointerdown", (e) => {
    dragging = {
      id: e.pointerId,
      x: e.clientX,
      start: e.clientX,
      heading: targetHeading,
      y: e.clientY,
    };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    targetHeading = dragging.heading + (e.clientX - dragging.x) * 0.008;
    invalidate();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const tap =
      Math.hypot(e.clientX - dragging.start, e.clientY - dragging.y) < 8;
    dragging = null;
    if (!tap) return;
    const r = canvas.getBoundingClientRect();
    point.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(point, camera);
    const hit = ray.intersectObjects(photos.children, true)[0];
    if (hit?.object.userData.dishId) onDish(hit.object.userData.dishId);
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = null;
  });
  function setDishes(dishes) {
    const arrivals = new Map(
      photos.children.map((s) => [s.userData.dishId, s.userData.arrivedAt]),
    );
    photos.children.slice().forEach((s) => {
      photos.remove(s);
      s.material.dispose();
    });
    plateLayout(dishes.length).forEach((pos, i) => {
      const d = dishes[i];
      let texture = cache.get(d.id);
      if (!texture) {
        texture = loader.load(d.src, invalidate, undefined, () => {
          if (!disposed) host.dataset.photoError = "true";
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        cache.set(d.id, texture);
      }
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          alphaTest: 0.05,
          toneMapped: false,
        }),
      );
      sprite.scale.set(1.22, 1.22, 1);
      sprite.position.set(pos.x, 0.48, pos.z);
      sprite.userData.dishId = d.id;
      sprite.userData.arrivedAt = arrivals.get(d.id) ?? performance.now();
      photos.add(sprite);
    });
    invalidate();
  }
  return {
    setDishes,
    open(value) {
      opened = value;
      last = 0;
      invalidate();
    },
    view(value) {
      targetElevation = value === "top" ? 1.42 : 0.83;
      targetDistance = value === "close" ? 7.4 : 9.7;
      last = 0;
      invalidate();
    },
    turn(delta) {
      targetHeading += delta;
      last = 0;
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      cache.forEach((t) => t.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
