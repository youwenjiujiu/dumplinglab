import * as THREE from "./vendor/three.module.js";

/* The restaurant's table, in the scene.
   A deep wine-red lacquer top framed in oak, at the height the dish stands on
   (y = TABLE_TOP). The top is wider than any phone screen so only its far
   edge and its front edge are ever seen, like a table in a photograph. It
   carries a true planar reflection of whatever stands on it, rendered each
   frame from a mirrored camera (after three.js' Reflector) and mixed into the
   lacquer, so a bowl set down on it is visibly resting on it. */

export const TABLE_TOP = -0.71;

/* A small studio, baked into an environment map: soft key, ceiling, fill
   and back walls, a dim floor. It gives lacquer, glaze and chrome their
   sheen without shipping an HDR file. */
export function makeStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const panel = (w, h, color, intensity, position, lookAt) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    mesh.position.copy(position); mesh.lookAt(lookAt); scene.add(mesh);
  };
  const origin = new THREE.Vector3();
  panel(6, 4, 0xffffff, 3.2, new THREE.Vector3(-3, 6, 4), origin);
  panel(8, 8, 0xfff8ef, 1.4, new THREE.Vector3(0, 8, 0), origin);
  panel(10, 6, 0xeef2ff, 0.9, new THREE.Vector3(6, 3, 2), origin);
  panel(10, 6, 0xffffff, 0.6, new THREE.Vector3(0, 3, -7), origin);
  panel(14, 14, 0x777066, 0.5, new THREE.Vector3(0, -3, 0), new THREE.Vector3(0, 1, 0));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return texture;
}


function woodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 64;
  const g = canvas.getContext("2d");
  g.fillStyle = "#A9753F"; g.fillRect(0, 0, 512, 64);
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 110; i++) {
    g.strokeStyle = `rgba(${70 + rnd() * 40 | 0},${34 + rnd() * 22 | 0},${12 + rnd() * 10 | 0},${0.06 + rnd() * 0.16})`;
    g.lineWidth = 0.5 + rnd() * 1.8;
    const y = rnd() * 64;
    g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(170, y + (rnd() - .5) * 7, 340, y + (rnd() - .5) * 7, 512, y + (rnd() - .5) * 5);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 1);
  texture.anisotropy = 8;
  return texture;
}

export function makeTable(renderer, scene, { top = TABLE_TOP, width = 9, depth = 4.45, centerZ = -1.475, colour = 0x7E2617, reflect = 0.14 } = {}) {
  const group = new THREE.Group();
  group.name = "table";

  // The oak frame: slightly larger than the top; its thickness is the front edge you see.
  const wood = woodTexture();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.36, 0.24, depth + 0.36),
    new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6, metalness: 0 }),
  );
  frame.position.set(0, top - 0.14, centerZ);
  group.add(frame);
  // The chrome pedestal the store's tables stand on: a column and a round base on the floor.
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.75, roughness: 0.32 });
  const floorY = top - 1.7;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, top - 0.26 - floorY, 24), chrome);
  column.position.set(0, (top - 0.26 + floorY) / 2, centerZ + depth / 2 - 1.1);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.05, 40), chrome);
  base.position.set(0, floorY + 0.025, column.position.z);
  group.add(column, base);

  // The lacquer top with its reflection.
  const target = new THREE.WebGLRenderTarget(768, 768);
  const textureMatrix = new THREE.Matrix4();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tReflection: { value: target.texture },
      textureMatrix: { value: textureMatrix },
      colour: { value: new THREE.Color(colour) },
      reflect: { value: reflect },
      farZ: { value: centerZ - depth / 2 },
      nearZ: { value: centerZ + depth / 2 },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUv4; varying vec3 vWorld; varying vec3 vNormalW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vUv4 = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform sampler2D tReflection; uniform vec3 colour; uniform float reflect; uniform float farZ; uniform float nearZ;
      varying vec4 vUv4; varying vec3 vWorld; varying vec3 vNormalW;
      void main() {
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(vNormalW, v), 0.0), 3.0);
        float t = clamp((vWorld.z - farZ) / (nearZ - farZ), 0.0, 1.0);   // 0 at the wall, 1 nearest us
        vec3 base = colour * (1.18 - 0.34 * t);                            // lit toward the window, deeper toward us
        vec4 r = texture2DProj(tReflection, vUv4);
        float k = reflect + 0.4 * fres;
        vec3 c = mix(base, r.rgb * (1.18 - 0.34 * t), k) + vec3(0.04) * fres;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  topMesh.rotation.x = -Math.PI / 2;
  topMesh.position.set(0, top + 0.002, centerZ);
  group.add(topMesh);
  scene.add(group);

  // Planar reflection: look at the scene from the camera's mirror image below the top.
  const virtualCamera = new THREE.PerspectiveCamera();
  const reflectorWorldPosition = new THREE.Vector3(), cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4(), normal = new THREE.Vector3(), view = new THREE.Vector3();
  const lookAtPosition = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let rendering = false;

  const beforeRender = camera => {
    if (rendering || !group.visible) return;
    camera.updateMatrixWorld();
    topMesh.updateMatrixWorld();
    reflectorWorldPosition.setFromMatrixPosition(topMesh.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    rotationMatrix.extractRotation(topMesh.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotationMatrix);
    view.subVectors(reflectorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;                       // camera under the table: nothing to reflect
    view.reflect(normal).negate().add(reflectorWorldPosition);
    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
    lookTarget.subVectors(reflectorWorldPosition, lookAtPosition).reflect(normal).negate().add(reflectorWorldPosition);
    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
    virtualCamera.lookAt(lookTarget);
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix.multiply(virtualCamera.projectionMatrix).multiply(virtualCamera.matrixWorldInverse).multiply(topMesh.matrixWorld);

    rendering = true;
    group.visible = false;
    const currentTarget = renderer.getRenderTarget();
    const xr = renderer.xr.enabled, shadows = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
    const clearColour = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(material.uniforms.colour.value, 1);
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);
    renderer.clear();
    renderer.render(scene, virtualCamera);
    renderer.setRenderTarget(currentTarget);
    renderer.setClearColor(clearColour, clearAlpha);
    renderer.xr.enabled = xr; renderer.shadowMap.autoUpdate = shadows;
    group.visible = true;
    rendering = false;
  };

  return {
    group,
    top,
    beforeRender,
    dispose() {
      scene.remove(group);
      target.dispose();
      wood.dispose();
      frame.geometry.dispose(); frame.material.dispose(); column.geometry.dispose(); base.geometry.dispose(); chrome.dispose();
      topMesh.geometry.dispose(); material.dispose();
    },
  };
}
