import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(() => {
    const container = document.getElementById('studio3DMugViewer');
    const status = document.getElementById('studioPreviewStatus');
    const productSelect = document.getElementById('studioProduct');

    if (!container) {
        console.error('SELFII mug viewer container was not found.');
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f1f1);

    const camera = new THREE.PerspectiveCamera(
        35, 1, 0.001, 100
    );

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a9a0, 2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(1, 2, 2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-2, 1, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2);
    rimLight.position.set(0, 2, -2);
    scene.add(rimLight);

    let mugBodyMaterials = [];
    let currentArtworkFile = null;
    let currentTexture = null;
    let currentArtworkURL = null;
    let mugReady = false;

    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function setArtwork(file) {
        if (!file) return;

        currentArtworkFile = file;

        if (!mugReady) return;

        const url = URL.createObjectURL(file);

        new THREE.TextureLoader().load(
            url,
            texture => {
                if (currentArtworkURL) {
                    URL.revokeObjectURL(currentArtworkURL);
                }

                if (currentTexture) currentTexture.dispose();

                currentArtworkURL = url;
                currentTexture = texture;

                // Build a white mug texture with artwork printed only on the front.
                const sourceImage = texture.image;
                texture.dispose();

                const printCanvas = document.createElement('canvas');
                printCanvas.width = 1024;
                printCanvas.height = 1024;

                const context = printCanvas.getContext('2d');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, printCanvas.width, printCanvas.height);

                // Front centre matches the mug's initial camera direction.
                const centerU = 0.88;
                const centerV = 0.5;
                const maxPrintWidth = printCanvas.width * 0.58;
                const maxPrintHeight = printCanvas.height * 1.00;

                const imageRatio = sourceImage.width / sourceImage.height;
                let printWidth = maxPrintWidth;
                let printHeight = printWidth / imageRatio;

                if (printHeight > maxPrintHeight) {
                    printHeight = maxPrintHeight;
                    printWidth = printHeight * imageRatio;
                }

                context.drawImage(
                    sourceImage,
                    centerU * printCanvas.width - printWidth / 2,
                    centerV * printCanvas.height - printHeight / 2,
                    printWidth,
                    printHeight
                );

                const frontPrintTexture = new THREE.CanvasTexture(printCanvas);
                frontPrintTexture.colorSpace = THREE.SRGBColorSpace;
                frontPrintTexture.flipY = true;
                frontPrintTexture.wrapS = THREE.ClampToEdgeWrapping;
                frontPrintTexture.wrapT = THREE.ClampToEdgeWrapping;
                frontPrintTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                frontPrintTexture.needsUpdate = true;

                currentTexture = frontPrintTexture;

                mugBodyMaterials.forEach(material => {
                    material.map = frontPrintTexture;
                    material.color.set(0xffffff);
                    material.needsUpdate = true;
                });

                if (status) status.textContent = 'Your artwork is printed on the front of the mug. Drag to rotate.';
            },
            undefined,
            error => {
                URL.revokeObjectURL(url);
                console.error('SELFII mug artwork failed to load:', error);
                if (status) status.textContent = 'Could not load mug artwork.';
            }
        );
    }

    function setVisible(visible) {
        container.hidden = !visible;
        container.style.display = visible ? "block" : "none";

        if (visible) {
            requestAnimationFrame(resize);
        }
    }

    async function capturePreview() {
        if (!mugReady || !renderer) return null;

        await new Promise(resolve =>
            requestAnimationFrame(() =>
                requestAnimationFrame(resolve)
            )
        );

        resize();

        if (!container.clientWidth || !container.clientHeight) return null;

        controls.update();
        renderer.render(scene, camera);

        return renderer.domElement.toDataURL("image/png");
    }

    window.SELFII_3D_MUG = {
        setArtwork,
        setVisible,
        capturePreview
    };

    setVisible(productSelect?.value === 'Mug');

    new GLTFLoader().load(
        '../assets/models/mug/mug-330-ml-stoneware.glb',
        gltf => {
            const mug = gltf.scene;
            let mugBodyMesh = null;
            let largestVolume = -1;

            mug.traverse(object => {
                if (!object.isMesh || !object.geometry) return;

                object.geometry.computeBoundingBox();

                const size = new THREE.Vector3();
                object.geometry.boundingBox.getSize(size);

                const volume = size.x * size.y * size.z;

                if (volume > largestVolume) {
                    largestVolume = volume;
                    mugBodyMesh = object;
                }
            });

            mug.traverse(object => {
                if (!object.isMesh) return;

                object.castShadow = true;
                object.receiveShadow = true;

                const isMugBody = object === mugBodyMesh;

                if (isMugBody) {
                    const geometry = object.geometry;
                    geometry.computeBoundingBox();

                    const bounds = geometry.boundingBox;
                    const positions = geometry.attributes.position;
                    const minY = bounds.min.y;
                    const height = bounds.max.y - minY;
                    const centerX = (bounds.min.x + bounds.max.x) / 2;
                    const centerZ = (bounds.min.z + bounds.max.z) / 2;
                    const uv = new Float32Array(positions.count * 2);

                    for (let i = 0; i < positions.count; i++) {
                        const x = positions.getX(i) - centerX;
                        const y = positions.getY(i);
                        const z = positions.getZ(i) - centerZ;

                        const angle = Math.atan2(z, x);
                        uv[i * 2] = (angle + Math.PI) / (2 * Math.PI);
                        uv[i * 2 + 1] = (y - minY) / height;
                    }

                    geometry.setAttribute(
                        'uv',
                        new THREE.BufferAttribute(uv, 2)
                    );
                }

                const sourceMaterials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                const newMaterials = sourceMaterials.map(source => {
                    const material = source.clone();
                    material.color.set(0xffffff);
                    material.metalness = 0;
                    material.roughness = isMugBody ? 0.28 : 0.22;
                    material.map = null;
                    material.needsUpdate = true;

                    if (isMugBody) mugBodyMaterials.push(material);

                    return material;
                });

                object.material = Array.isArray(object.material)
                    ? newMaterials
                    : newMaterials[0];
            });

            const bounds = new THREE.Box3().setFromObject(mug);
            const center = bounds.getCenter(new THREE.Vector3());
            const dimensions = bounds.getSize(new THREE.Vector3());

            mug.position.sub(center);
            scene.add(mug);

            const maxDim = Math.max(
                dimensions.x,
                dimensions.y,
                dimensions.z
            );

            camera.position.set(maxDim * 3.1, maxDim * 1.5, maxDim * 2.5);
            camera.lookAt(0, 0, 0);

            controls.target.set(0, 0, 0);
            controls.minDistance = maxDim * 1.2;
            controls.maxDistance = maxDim * 8;
            controls.update();

            mugReady = true;

            if (currentArtworkFile) {
                setArtwork(currentArtworkFile);
            }

            resize();

            if (status) {
                status.textContent = '3D mug ready. Drag to rotate and scroll to zoom.';
            }

            console.log('SELFII 3D mug preview initialized.');
        },
        undefined,
        error => {
            console.error('SELFII mug model failed to load:', error);
            if (status) status.textContent = 'Mug preview could not be loaded.';
        }
    );

    function animate() {
        requestAnimationFrame(animate);

        if (!container.hidden && container.clientWidth > 0 && container.clientHeight > 0) {
            controls.update();
            renderer.render(scene, camera);
        }
    }

    animate();

    window.addEventListener('resize', resize);

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(container);
    }
})();
