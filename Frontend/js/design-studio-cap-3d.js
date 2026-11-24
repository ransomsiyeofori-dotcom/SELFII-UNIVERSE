import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewer = document.getElementById('studio3DCapViewer');
const status = document.getElementById('studio3DCapStatus');

if (viewer && status) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x252830);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x777788, 2));

  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(2, 4, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 2);
  fill.position.set(-3, 2, -4);
  scene.add(fill);

  const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
  frontLight.position.set(4, 1, 0);
  scene.add(frontLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function resize() {
    const w = viewer.clientWidth, h = viewer.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(viewer);

  let capModel = null;
  let modelCenter = new THREE.Vector3();
  let artworkLayer = null;
  let artworkTexture = null;
  let pendingArtwork = null;
  let currentUrl = null;
  let artworkRequestId = 0;
  let artworkReadyPromise = Promise.resolve(false);
  let resolveArtworkReady = null;

  function finishArtworkReady(ready, requestId = artworkRequestId) {
    if (requestId !== artworkRequestId || !resolveArtworkReady) return;

    const resolve = resolveArtworkReady;
    resolveArtworkReady = null;
    resolve(ready);
  }

  function makeArtworkLayer(texture) {
    if (artworkLayer) {
      scene.remove(artworkLayer);
      artworkLayer.geometry.dispose();
      artworkLayer.material.dispose();
      artworkLayer = null;
    }
    if (artworkTexture && artworkTexture !== texture) artworkTexture.dispose();
    artworkTexture = texture;

    if (!capModel) return false;

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const crownMeshes = [];
    capModel.traverse(object => {
      if (object.isMesh && (object.name || '').toLowerCase().includes('crown')) {
        crownMeshes.push(object);
      }
    });

    if (!crownMeshes.length) {
      status.textContent = 'Could not find the cap crown surface.';
      console.error('No cap crown mesh found.');
      return false;
    }

    const columns = 48, rows = 36;
    const vertices = [], uvs = [], indices = [];
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(-1, 0, 0);
    const normalMatrix = new THREE.Matrix3();

    // Exact approved placement from the standalone cap preview.
    const centerY = 0.069;
    const halfWidth = 0.043;
    const halfHeight = 0.028;

    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const y = centerY + (v - 0.5) * 2 * halfHeight;

      for (let col = 0; col <= columns; col++) {
        const u = col / columns;
        const z = (u - 0.5) * 2 * halfWidth;
        const origin = new THREE.Vector3(
          0.25 - modelCenter.x,
          y - modelCenter.y,
          z - modelCenter.z
        );

        raycaster.set(origin, direction);
        const hits = raycaster.intersectObjects(crownMeshes, false);
        if (!hits.length) {
          status.textContent = 'Artwork area extends beyond the crown surface.';
          console.error('No crown hit at artwork grid point:', u, v);
          return false;
        }

        const hit = hits[0];
        const normal = hit.face.normal.clone();
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        normal.applyMatrix3(normalMatrix).normalize();
        const point = hit.point.clone().addScaledVector(normal, 0.0007);

        vertices.push(point.x, point.y, point.z);
        uvs.push(1 - u, v);
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const a = row * (columns + 1) + col;
        const b = a + 1, c = a + columns + 1, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });

    artworkLayer = new THREE.Mesh(geometry, material);
    artworkLayer.renderOrder = 10;
    scene.add(artworkLayer);
    status.textContent = 'Artwork conformed to the cap fabric.';
    console.log('SELFII cap artwork conformed to crown geometry.');
    return true;
  }

  function loadArtwork(file, requestId) {
    if (!file || !capModel) return;

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);
    const requestedUrl = currentUrl;

    new THREE.TextureLoader().load(
      requestedUrl,
      texture => {
        if (requestId !== artworkRequestId || currentUrl !== requestedUrl) {
          texture.dispose();
          return;
        }

        const applied = makeArtworkLayer(texture);
        finishArtworkReady(applied, requestId);
      },
      undefined,
      error => {
        if (requestId !== artworkRequestId) return;

        console.error(error);
        status.textContent = 'Artwork could not be loaded onto the cap.';
        finishArtworkReady(false, requestId);
      }
    );
  }

  function setArtwork(file) {
    if (!file) return;

    pendingArtwork = file;
    const requestId = ++artworkRequestId;

    if (resolveArtworkReady) {
      const resolvePrevious = resolveArtworkReady;
      resolveArtworkReady = null;
      resolvePrevious(false);
    }

    artworkReadyPromise = new Promise(resolve => {
      resolveArtworkReady = resolve;
    });

    // If the model is still loading, the promise remains pending.
    // The model-load callback will apply this same request.
    if (capModel) loadArtwork(file, requestId);
  }

  function whenArtworkReady() {
    return artworkReadyPromise;
  }

  function setVisible(visible) {
    viewer.hidden = !visible;
    viewer.style.display = visible ? "block" : "none";
    if (visible) requestAnimationFrame(resize);
  }

  async function capturePreview() {
    if (!capModel || !renderer) return null;

    await whenArtworkReady();

    await new Promise(resolve =>
      requestAnimationFrame(() =>
        requestAnimationFrame(resolve)
      )
    );

    resize();

    if (!viewer.clientWidth || !viewer.clientHeight) return null;

    controls.update();
    renderer.render(scene, camera);

    return renderer.domElement.toDataURL("image/png");
  }

  window.SELFII_3D_CAP = {
    setArtwork,
    whenArtworkReady,
    setVisible,
    capturePreview
  };

  const whiteCanvas = document.createElement('canvas');
  whiteCanvas.width = whiteCanvas.height = 4;
  const ctx = whiteCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 4, 4);

  const whiteTexture = new THREE.CanvasTexture(whiteCanvas);
  whiteTexture.colorSpace = THREE.SRGBColorSpace;
  whiteTexture.flipY = false;

  status.textContent = 'Loading cap model...';

  new GLTFLoader().load(
    '../assets/models/cap/baseball-cap.glb',
    gltf => {
      capModel = gltf.scene;
      window.SELFII_CAP_MODEL = capModel;

      capModel.traverse(object => {
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material && (material.name || '').toLowerCase() === 'navy cotton twill') {
            material.map = whiteTexture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
          }
        });
      });

      const bounds = new THREE.Box3().setFromObject(capModel);
      modelCenter = bounds.getCenter(new THREE.Vector3());
      const dimensions = bounds.getSize(new THREE.Vector3());
      capModel.position.sub(modelCenter);
      scene.add(capModel);
      capModel.updateMatrixWorld(true);

      const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z);
      camera.position.set(maxDim * 2.6, maxDim * 1.25, 0);
      camera.near = maxDim / 100;
      camera.far = maxDim * 100;
      camera.updateProjectionMatrix();

      controls.target.set(0, 0, 0);
      controls.minDistance = maxDim * 0.8;
      controls.maxDistance = maxDim * 6;
      controls.update();

      status.textContent = 'White cap loaded. Upload artwork to preview it.';
      if (pendingArtwork) loadArtwork(pendingArtwork, artworkRequestId);
      resize();
      console.log('SELFII 3D cap loaded.', dimensions);
    },
    undefined,
    error => {
      console.error(error);
      status.textContent = 'Cap model failed to load.';
      finishArtworkReady(false);
    }
  );

  function animate() {
    requestAnimationFrame(animate);

    if (!viewer.hidden && viewer.clientWidth > 0 && viewer.clientHeight > 0) {
      controls.update();
      renderer.render(scene, camera);
    }
  }
  animate();
  window.addEventListener('resize', resize);
  setVisible(document.getElementById('studioProduct')?.value === 'Cap');
}
