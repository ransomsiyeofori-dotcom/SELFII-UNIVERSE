import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(() => {
    const viewer = document.getElementById('studio3DViewer');
    const canvas = document.getElementById('studioPreviewCanvas');

    if (!viewer) {
        console.error('SELFII 3D viewer element was not found.');
        return;
    }

    let scene, camera, renderer, controls;
    let shirtLoaded = false;
    let maskImage = null;
    let currentArtworkImage = null;
    let originalTextureImage = null;
    let shirtMaterial = null;
    let outputCanvas = null;
    let artworkURL = null;
    let resizeObserver = null;
    let artworkReadyPromise = Promise.resolve(true);
    let resolveArtworkReady = null;
    let artworkRequestId = 0;

    function finishArtworkReady(ready, requestId = artworkRequestId) {
        if (
            requestId !== artworkRequestId ||
            !resolveArtworkReady
        ) {
            return;
        }

        resolveArtworkReady(ready);
        resolveArtworkReady = null;
    }

    const status = document.createElement('div');
    status.className = 'studio-3d-status';
    status.textContent = 'Loading 3D T-shirt...';
    viewer.appendChild(status);

    function setStatus(message) {
        status.textContent = message;
        status.hidden = !message;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171717);

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    viewer.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-10, 5, -8);
    scene.add(fillLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 10;
    controls.maxDistance = 120;

    function resize() {
        const width = viewer.clientWidth;
        const height = viewer.clientHeight;
        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewer);

    function tryApplyArtwork() {
        if (shirtLoaded && maskImage && currentArtworkImage) {
            applyArtwork();
        }
    }

    function applyArtwork() {
        if (!originalTextureImage || !maskImage || !currentArtworkImage || !shirtMaterial) {
            return;
        }

        const size = originalTextureImage.width;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = size;
        maskCanvas.height = size;

        const maskContext = maskCanvas.getContext('2d');
        maskContext.save();
        maskContext.translate(0, size);
        maskContext.scale(1, -1);
        maskContext.drawImage(maskImage, 0, 640, size, size);
        maskContext.restore();

        const maskPixels = maskContext.getImageData(0, 0, size, size).data;
        let minX = size, minY = size, maxX = 0, maxY = 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (maskPixels[(y * size + x) * 4 + 3] > 10) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (maxX <= minX || maxY <= minY) {
            setStatus('The chest print mask appears empty.');
            finishArtworkReady(false);
            return;
        }

        const printWidth = (maxX - minX) * 0.92;
        const printHeight = (maxY - minY) * 0.92;
        const scale = Math.min(
            printWidth / currentArtworkImage.width,
            printHeight / currentArtworkImage.height
        );

        const drawWidth = currentArtworkImage.width * scale;
        const drawHeight = currentArtworkImage.height * scale;

        const artworkLayer = document.createElement('canvas');
        artworkLayer.width = size;
        artworkLayer.height = size;

        const artworkContext = artworkLayer.getContext('2d');
        artworkContext.globalAlpha = 0.97;
        artworkContext.drawImage(
            currentArtworkImage,
            minX + ((maxX - minX) - drawWidth) / 2,
            minY + ((maxY - minY) - drawHeight) / 2,
            drawWidth,
            drawHeight
        );

        artworkContext.globalAlpha = 1;
        artworkContext.globalCompositeOperation = 'destination-in';
        artworkContext.filter = 'blur(1.2px)';
        artworkContext.drawImage(maskCanvas, 0, 0);
        artworkContext.filter = 'none';

        outputCanvas = document.createElement('canvas');
        outputCanvas.width = size;
        outputCanvas.height = size;

        const outputContext = outputCanvas.getContext('2d');
        // SELFII plain-white shirt base: remove the model's original printed graphic.
        outputContext.fillStyle = "#ffffff";
        outputContext.fillRect(0, 0, size, size);
        outputContext.drawImage(artworkLayer, 0, 0);

        const updatedTexture = new THREE.CanvasTexture(outputCanvas);
        updatedTexture.colorSpace = THREE.SRGBColorSpace;
        updatedTexture.flipY = shirtMaterial.map.flipY;
        updatedTexture.needsUpdate = true;

        if (shirtMaterial.map) {
            shirtMaterial.map.dispose();
        }
        shirtMaterial.map = updatedTexture;
        shirtMaterial.needsUpdate = true;

        setStatus('');
        finishArtworkReady(true);
    }

    function setArtwork(file) {
        if (!file) return;

        const requestId = ++artworkRequestId;

        if (resolveArtworkReady) {
            resolveArtworkReady(false);
            resolveArtworkReady = null;
        }

        if (artworkURL) URL.revokeObjectURL(artworkURL);

        artworkURL = URL.createObjectURL(file);
        currentArtworkImage = null;

        artworkReadyPromise = new Promise(resolve => {
            resolveArtworkReady = resolve;
        });

        const image = new Image();

        image.onload = () => {
            if (requestId !== artworkRequestId) return;

            currentArtworkImage = image;
            tryApplyArtwork();
        };

        image.onerror = () => {
            if (requestId !== artworkRequestId) return;

            setStatus('Could not load the selected artwork.');
            finishArtworkReady(false, requestId);
        };

        image.src = artworkURL;
    }

    function whenArtworkReady() {
        return artworkReadyPromise;
    }

    function setVisible(visible) {
        viewer.hidden = !visible;
        viewer.style.display = visible ? "block" : "none";

        // The main Design Studio controller owns shared canvas visibility.
        if (visible) {
            requestAnimationFrame(() => {
                resize();
                tryApplyArtwork();
            });
        }
    }

    async function capturePreview() {
        if (!shirtLoaded || !renderer) return null;

        // Wait until the uploaded artwork has been applied to the shirt.
        if (!await artworkReadyPromise) return null;

        // Wait for the gallery to reveal the viewer before measuring it.
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

    window.SELFII_3D_TSHIRT = {
        setArtwork,
        setVisible,
        capturePreview,
        whenArtworkReady
    };

    // The regular Design Studio script runs before this module.
    // Restore the correct initial preview state now that the API exists.
    const productSelect = document.getElementById('studioProduct');
    setVisible(productSelect?.value === 'T-shirt');

    const existingPreview = document.getElementById('studioArtworkPreview');
    if (existingPreview?.complete && existingPreview.naturalWidth) {
        currentArtworkImage = existingPreview;
    }

    // Load the chest mask independently; artwork is applied when both are ready.
    const maskLoader = new Image();
    maskLoader.onload = () => {
        maskImage = maskLoader;
        tryApplyArtwork();
    };
    maskLoader.onerror = () => {
        setStatus('Could not load the T-shirt chest print mask.');
        console.error('SELFII chest mask failed to load.');
        finishArtworkReady(false);
    };
    maskLoader.src = '../assets/models/inspection/selfii-chest-print-mask.png';

    const loader = new GLTFLoader();
    loader.load(
        '../assets/models/inspection/selfii-tshirt.glb',
        (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            scene.add(model);

            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            const distance = maxDimension * 1.8;

            camera.position.set(0, 0, distance);
            camera.near = Math.max(0.1, distance / 100);
            camera.far = distance * 100;
            camera.updateProjectionMatrix();

            controls.target.set(0, 0, 0);
            controls.update();

            model.traverse((object) => {
                if (!object.isMesh) return;

                const material = Array.isArray(object.material)
                    ? object.material[0]
                    : object.material;

                if (material?.map?.image && !shirtMaterial) {
                    shirtMaterial = material;
                    originalTextureImage = material.map.image;
                }
            });

            shirtLoaded = true;
            setStatus('');
            tryApplyArtwork();
            resize();
        },
        undefined,
        (error) => {
            console.error('SELFII 3D T-shirt failed to load:', error);
            setStatus('Could not load the 3D T-shirt model.');
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

    window.addEventListener('beforeunload', () => {
        resizeObserver?.disconnect();
        controls.dispose();
        renderer.dispose();
        if (artworkURL) URL.revokeObjectURL(artworkURL);
    });
})();
