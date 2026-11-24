import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewer = document.getElementById('studio3DFrameViewer');
const status = document.getElementById('studio3DFrameStatus');

if (viewer && status) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x252830);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
  camera.position.set(0, 0.20, 0.85);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewer.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2));

  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(2, 4, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 1.5);
  fill.position.set(-3, 2, -3);
  scene.add(fill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.12, 0);
  controls.minDistance = 0.35;
  controls.maxDistance = 2;

  let frameModel = null;
  let pendingFile = null;
  let artworkTexture = null;
  let artworkURL = null;
  let artworkRequestId = 0;
  let artworkReadyPromise = Promise.resolve(false);
  let resolveArtworkReady = null;

  function finishArtworkReady(ready, requestId = artworkRequestId) {
    if (requestId !== artworkRequestId || !resolveArtworkReady) return;

    const resolve = resolveArtworkReady;
    resolveArtworkReady = null;
    resolve(ready);
  }

  function resize() {
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  new ResizeObserver(resize).observe(viewer);

  function applyArtwork(file, requestId) {
    if (!file || !frameModel) return;

    if (artworkURL) URL.revokeObjectURL(artworkURL);
    artworkURL = URL.createObjectURL(file);
    const requestedURL = artworkURL;

    new THREE.TextureLoader().load(
      requestedURL,
      texture => {
        if (requestId !== artworkRequestId || artworkURL !== requestedURL) {
          texture.dispose();
          return;
        }

        URL.revokeObjectURL(requestedURL);
        artworkURL = null;

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        let found = false;

        frameModel.traverse(object => {
          if (!object.isMesh) return;

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          const insertIndex = materials.findIndex(material =>
            material?.name?.toLowerCase().includes('warm unprinted paper')
          );

          if (insertIndex === -1) return;

          const updatedMaterials = materials.map((material, index) => {
            if (index !== insertIndex) return material;

            const updated = material.clone();
            updated.map = texture;
            updated.color.set(0xffffff);
            updated.roughness = 0.9;
            updated.metalness = 0;
            updated.needsUpdate = true;
            return updated;
          });

          object.material = Array.isArray(object.material)
            ? updatedMaterials
            : updatedMaterials[0];

          found = true;
        });

        if (found) {
          if (artworkTexture) artworkTexture.dispose();
          artworkTexture = texture;
          status.textContent = 'Your artwork is on the picture frame';
        } else {
          texture.dispose();
          status.textContent = 'Picture insert material not found';
          console.error('SELFII frame: Warm unprinted paper material not found.');
        }

        finishArtworkReady(found, requestId);
      },
      undefined,
      error => {
        if (requestId !== artworkRequestId) return;

        if (artworkURL === requestedURL) {
          URL.revokeObjectURL(requestedURL);
          artworkURL = null;
        }

        console.error('SELFII frame artwork texture error:', error);
        status.textContent = 'Could not load your artwork';
        finishArtworkReady(false, requestId);
      }
    );
  }

  function setArtwork(file) {
    if (!file) return;

    pendingFile = file;
    const requestId = ++artworkRequestId;

    if (resolveArtworkReady) {
      const resolvePrevious = resolveArtworkReady;
      resolveArtworkReady = null;
      resolvePrevious(false);
    }

    artworkReadyPromise = new Promise(resolve => {
      resolveArtworkReady = resolve;
    });

    // If the model has not loaded yet, keep this promise pending.
    // The model-load callback will apply this same request.
    if (frameModel) applyArtwork(file, requestId);
  }

  function whenArtworkReady() {
    return artworkReadyPromise;
  }

  new GLTFLoader().load(
    '../assets/models/picture-frame/picture-frame.glb',
    gltf => {
      frameModel = gltf.scene;

      frameModel.traverse(object => {
        if (!object.isMesh) return;

        object.castShadow = true;
        object.receiveShadow = true;

        const materials = Array.isArray(object.material)
          ? object.material
          : object.material ? [object.material] : [];

        if (materials.some(material =>
          material?.name?.toLowerCase().includes('clear glass')
        )) {
          object.visible = false;
        }
      });

      scene.add(frameModel);
      status.textContent = 'Picture frame ready — drag to rotate';
      resize();

      if (pendingFile) applyArtwork(pendingFile, artworkRequestId);
    },
    undefined,
    error => {
      console.error('SELFII picture frame model failed to load:', error);
      status.textContent = 'Could not load picture frame';
      finishArtworkReady(false);
    }
  );

  async function capturePreview() {
    if (!frameModel || !renderer) return null;

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

  window.SELFII_3D_FRAME = {
    capturePreview,
    setArtwork,
    whenArtworkReady,
    setVisible(visible) {
      viewer.hidden = !visible;
      viewer.style.display = visible ? 'block' : 'none';
      if (visible) {
        resize();
        controls.update();
      }
    }
  };

  function animate() {
    requestAnimationFrame(animate);

    if (!viewer.hidden && viewer.clientWidth > 0 && viewer.clientHeight > 0) {
      controls.update();
      renderer.render(scene, camera);
    }
  }

  animate();
}
