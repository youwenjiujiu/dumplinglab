// Geometry and serving checks. These do not substitute for a WebGL visual test.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "../../web/vendor/three.module.js";

const source = await readFile(
  new URL("./table-scene.js", import.meta.url),
  "utf8",
);
const { buildSteamer, plateLayout } = new Function(
  "THREE",
  source
    .replace(/^import .*;\n/, "")
    .replaceAll("export function", "function") +
    "\nreturn { buildSteamer, plateLayout };",
)(THREE);
const { root, lid } = buildSteamer();
assert.equal(lid.parent, root);
assert.equal(lid.name, "liftable-lid");
let meshCount = 0,
  triangles = 0;
const geometries = new Set(),
  materials = new Set();
root.traverse((object) => {
  if (!object.isMesh) return;
  meshCount++;
  const p = object.geometry.attributes.position;
  assert(p.count > 0);
  for (const coordinate of p.array) assert(Number.isFinite(coordinate));
  triangles += (object.geometry.index?.count || p.count) / 3;
  geometries.add(object.geometry);
  materials.add(object.material);
});
assert(meshCount > 60, "Lid weave and basket are true meshes");
assert(triangles < 90000, "Keep geometry budget modest for phones");
const closed = new THREE.Box3().setFromObject(root);
assert(closed.min.y >= 0 && closed.max.y < 1, "Closed lid is correctly seated");
lid.position.set(-0.88, 1.27, -0.45);
lid.rotation.set(-0.32, 0, -0.48);
assert(
  new THREE.Box3().setFromObject(root).max.y < 2.2,
  "Lifted lid remains within staging bounds",
);
for (let n = 0; n <= 12; n++) {
  const layout = plateLayout(n);
  assert.equal(layout.length, Math.min(n, 6));
  layout.forEach((p, i) =>
    layout
      .slice(i + 1)
      .forEach((q) =>
        assert(
          Math.hypot(p.x - q.x, p.z - q.z) > 1.5,
          "Neighbouring dishes have room",
        ),
      ),
  );
}
geometries.forEach((g) => g.dispose());
materials.forEach((m) => m.dispose());
const origin = "http://127.0.0.1:7898";
for (const path of [
  "/table-scene.js",
  "/vendor/three.module.js",
  "/atelier.css?v=7",
]) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200, path);
  assert((await r.text()).length > 100);
}
assert.equal((await fetch(origin + "/server/order-core.js")).status, 404);
console.log(
  `PASS: ${meshCount} meshes, ${triangles} triangles; finite geometry, lid bounds, plate spacing, 3D module routes, server-source isolation.`,
);
