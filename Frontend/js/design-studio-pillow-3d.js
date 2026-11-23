import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

const mockup = document.getElementById('studioProductMockup');

if (!mockup) {
  throw new Error('SELFII Pillow: Product preview container not found.');
}

const viewer = document.createElement('div');
viewer.id = 'studio3DPillowViewer';
viewer.hidden = true;

Object.assign(viewer.style, {
  width: '100%',
  height: '520px',
  minHeight: '420px',
  position: 'relative',
  display: 'none'
});

const status = document.createElement('div');
status.textContent = 'Loading white pillow...';

Object.assign(status.style, {
  position: 'absolute',
  left: '12px',
  bottom: '10px',
  zIndex: '2',
  color: '#fff',
  background: 'rgba(32,35,42,.8)',
  padding: '8px 10px',
  borderRadius: '5px',
  fontSize: '12px',
  pointerEvents: 'none'
});

viewer.appendChild(status);

const toteViewer = document.getElementById('studio3DToteViewer');

if (toteViewer) {
  toteViewer.insertAdjacentElement('afterend', viewer);
} else {
  mockup.appendChild(viewer);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xececec);

const camera = new THREE.PerspectiveCamera(
  35,
  1,
  0.01,
  100
);

camera.position.set(0, 0.85, 1.2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

viewer.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2));

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(2, 4, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
fillLight.position.set(-3, 2, -3);
scene.add(fillLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.10, 0);
controls.update();

let pillow = null;
let cushionMesh = null;
let printMesh = null;
let currentTexture = null;
let pendingArtwork = null;
let managedArtworkURL = null;
let originalCameraPosition = camera.position.clone();
let originalTarget = controls.target.clone();

function removePrint() {
  if (printMesh) {
    scene.remove(printMesh);
    printMesh.geometry.dispose();
    printMesh.material.dispose();
    printMesh = null;
  }

  if (currentTexture) {
    currentTexture.dispose();
    currentTexture = null;
  }
}

function applyArtwork(source) {
  if (!cushionMesh) {
    pendingArtwork = source;
    status.textContent = 'Pillow is loading...';
    return;
  }

  removePrint();

  new THREE.TextureLoader().load(
    source,
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      currentTexture = texture;

      cushionMesh.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(cushionMesh);
      const center = bounds.getCenter(new THREE.Vector3());
      const top = bounds.max.y;

      // Project the artwork down onto the upper cushion surface.
      const position = new THREE.Vector3(
        center.x,
        top + 0.015,
        center.z
      );

      const orientation = new THREE.Euler(
        Math.PI / 2,
        0,
        0
      );

      // Keep the print inside the cushion edges.
      const size = new THREE.Vector3(0.34, 0.34, 0.20);

      const geometry = new DecalGeometry(
        cushionMesh,
        position,
        orientation,
        size
      );

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.9,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        depthTest: true
      });

      printMesh = new THREE.Mesh(geometry, material);
      printMesh.renderOrder = 2;
      scene.add(printMesh);

      status.textContent = 'Pillow print ready — drag to rotate';
      renderer.render(scene, camera);
    },
    undefined,
    error => {
      console.error('SELFII Pillow artwork error:', error);
      status.textContent = 'Could not load artwork.';
    }
  );
}

new GLTFLoader().load(
  '../assets/models/pillow/pillow.glb',
  gltf => {
    pillow = gltf.scene;
    scene.add(pillow);

    pillow.traverse(object => {
      if (!object.isMesh) return;

      if (object.name.toLowerCase().includes('cushion')) {
        cushionMesh = object;
      }

      const originals = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const whiteMaterials = originals.map(original => {
        const material = original.clone();
        material.color.set(0xffffff);
        material.map = null;
        material.needsUpdate = true;
        return material;
      });

      object.material = Array.isArray(object.material)
        ? whiteMaterials
        : whiteMaterials[0];
    });

    if (!cushionMesh) {
      status.textContent = 'Could not identify the cushion surface.';
      console.error('SELFII Pillow: Cushion mesh not found.');
      return;
    }

    const bounds = new THREE.Box3().setFromObject(pillow);
    const center = bounds.getCenter(new THREE.Vector3());
    const dimensions = bounds.getSize(new THREE.Vector3());

    pillow.position.sub(center);

    camera.position.set(0, dimensions.y * 2.8, dimensions.z * 3.2);
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();

    originalCameraPosition = camera.position.clone();
    originalTarget = controls.target.clone();

    status.textContent = 'White pillow ready — upload artwork';

    if (pendingArtwork) {
      applyArtwork(pendingArtwork);
    }

    console.log('SELFII Pillow loaded:', dimensions);
  },
  undefined,
  error => {
    console.error('SELFII Pillow model error:', error);
    status.textContent = 'Could not load pillow model.';
  }
);

function resize() {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;

  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

async function capturePreview() {
  if (!pillow) return null;

  await new Promise(resolve =>
    requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    )
  );

  resize();
  renderer.render(scene, camera);

  return renderer.domElement.toDataURL('image/png');
}

window.SELFII_3D_PILLOW = {
  capturePreview,

  setVisible(visible) {
    viewer.hidden = !visible;
    viewer.style.display = visible ? 'block' : 'none';

    if (visible) {
      resize();
      renderer.render(scene, camera);
    }
  },

  setArtwork(source) {
    if (!source) return;

    if (managedArtworkURL) {
      URL.revokeObjectURL(managedArtworkURL);
      managedArtworkURL = null;
    }

    let artworkSource = source;

    if (source instanceof Blob) {
      managedArtworkURL = URL.createObjectURL(source);
      artworkSource = managedArtworkURL;
    }

    pendingArtwork = artworkSource;

    if (cushionMesh) {
      applyArtwork(artworkSource);
    }
  },

  reset() {
    camera.position.copy(originalCameraPosition);
    controls.target.copy(originalTarget);
    controls.update();
  }
};

new ResizeObserver(resize).observe(viewer);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
