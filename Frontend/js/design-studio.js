"use strict";

(() => {
    const artworkInput = document.getElementById("studioArtwork");
    const productSelect = document.getElementById("studioProduct");
    const placementSelect = document.getElementById("studioPlacement");
    const previewImage = document.getElementById("studioArtworkPreview");
    const productMockup = document.getElementById("studioProductMockup");
    const productImage = document.getElementById("studioProductImage");
    const canvas = document.getElementById("studioPreviewCanvas");
    const dynamicMockupImage = document.getElementById("studioDynamicMockup");
    const placeholder = document.getElementById("studioPreviewPlaceholder");
    const fileName = document.getElementById("studioFileName");
    const previewStatus = document.getElementById("studioPreviewStatus");
    const mockupLoading = document.getElementById("studioMockupLoading");
    const loadingTitle = document.getElementById("studioLoadingTitle");
    const loadingMessage = document.getElementById("studioLoadingMessage");
    const submitButton = document.getElementById("studioSubmit");
    const orderPanel = document.getElementById("studioOrderPanel");
    const orderForm = document.getElementById("studioOrderForm");
    const backButton = document.getElementById("studioBackButton");
    const faceCheckStatus = document.getElementById("studioFaceCheckStatus");
    const gallery = document.getElementById("studioMockupGallery");
    const previewPanel = document.querySelector(".design-studio-preview");
    const galleryStatus = document.getElementById("studioGalleryStatus");

    const galleryProducts = [
        { name: "T-shirt", image: "studioGalleryTshirt", status: "studioGalleryTshirtStatus", api: "SELFII_3D_TSHIRT" },
        { name: "Cap", image: "studioGalleryCap", status: "studioGalleryCapStatus", api: "SELFII_3D_CAP" },
        { name: "Mug", image: "studioGalleryMug", status: "studioGalleryMugStatus", api: "SELFII_3D_MUG" },
        { name: "Picture Frame", image: "studioGalleryFrame", status: "studioGalleryFrameStatus", api: "SELFII_3D_FRAME" },
        { name: "Tote bag", image: "studioGalleryTote", status: "studioGalleryToteStatus", api: "SELFII_3D_TOTE" },
 { name:"Pillow", image:"studioGalleryPillow", status:"studioGalleryPillowStatus", api:"SELFII_3D_PILLOW" }
];

    if (
        !artworkInput || !productSelect || !placementSelect ||
        !previewImage || !productMockup || !productImage || !canvas
    ) {
        console.error("SELFII Design Studio: Required elements are missing.");
        return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
        console.error("SELFII Design Studio: Canvas is not supported.");
        return;
    }

    const productImages = {
        "T-shirt": "../assets/images/selfii-black-tshirt-front.png",
        "Shorts": "../assets/images/selfii-black-shorts-mockup.png"
    };

    const placements = {
        "Front": { x: 0.50, y: 0.49, width: 0.25 },
        "Back": { x: 0.50, y: 0.49, width: 0.25 },
        "Left chest": { x: 0.60, y: 0.39, width: 0.12 },
        "Full front": { x: 0.50, y: 0.49, width: 0.37 }
    };

    const methodLabels = {
        "dtg": "DTG printing",
        "screen-print": "Screen printing",
        "embroidery": "Embroidery"
    };

    let uploadedArtwork = null;
    let previewURL = null;
    let artworkReady = false;
    let mockupRequestId = 0;
    let faceCheckRequestId = 0;

    function setMockupLoading(visible, title, message) {
        if (!mockupLoading) return;

        mockupLoading.hidden = !visible;

        if (title && loadingTitle) {
            loadingTitle.textContent = title;
        }

        if (message && loadingMessage) {
            loadingMessage.textContent = message;
        }
    }

    function getPrintStyle() {
        return document.querySelector(
            'input[name="studioPrintStyle"]:checked'
        )?.value || "full-photo";
    }

    function getProductionMethod() {
        return document.querySelector(
            'input[name="studioProductionMethod"]:checked'
        )?.value || "dtg";
    }

    function updatePreviewStatus() {
        if (!previewStatus) return;

        const product = productSelect.value;
        const method = methodLabels[getProductionMethod()] || "DTG printing";

        if (!uploadedArtwork) {
            previewStatus.textContent = `${product} · Ready for your artwork`;
            return;
        }

        const style = getPrintStyle() === "full-photo"
            ? "Full photo"
            : "Background removal requested";

        previewStatus.textContent =
            `${product} · ${placementSelect.value} · ${method} · ${style}`;
    }

    async function renderAllDynamicMockups(file) {
        const requestId = ++mockupRequestId;

        if (!gallery || !productMockup) return;

        // Make the 3D viewers measurable before capturing gallery previews.
        if (previewPanel) previewPanel.hidden = false;

        gallery.hidden = false;

        if (galleryStatus) {
            galleryStatus.textContent = "Preparing five interactive product previews...";
        }

        galleryProducts.forEach((product) => {
            const image = document.getElementById(product.image);
            const status = document.getElementById(product.status);

            if (image) {
                image.hidden = true;
                image.removeAttribute("src");
            }

            if (status) status.textContent = "Preparing preview...";
        });

        let ready = 0;
        let failed = 0;

        try {
            productMockup.hidden = false;

            for (const product of galleryProducts) {
                if (requestId !== mockupRequestId) return;

                const image = document.getElementById(product.image);
                const status = document.getElementById(product.status);
                const module = window[product.api];

                if (!image || !module || typeof module.capturePreview !== "function") {
                    failed++;
                    if (status) status.textContent = "Preview unavailable";
                    continue;
                }

                try {
                    galleryProducts.forEach((item) => {
                        window[item.api]?.setVisible(false);
                    });

                    productMockup.hidden = false;
                    module.setVisible(true);

                    let previewUrl = null;

                    // Models load independently. Retry while the selected
                    // viewer becomes ready and obtains measurable dimensions.
                    for (let attempt = 0; attempt < 40; attempt++) {
                        if (requestId !== mockupRequestId) return;

                        previewUrl = await module.capturePreview();

                        if (previewUrl) break;

                        await new Promise(resolve => setTimeout(resolve, 250));
                    }

                    if (requestId !== mockupRequestId) return;

                    if (!previewUrl) {
                        throw new Error(
                            "The 3D model did not become ready, or its viewer has no measurable size after 10 seconds."
                        );
                    }

                    image.src = previewUrl;
                    image.hidden = false;

                    if (status) status.textContent = "Preview ready";

                    ready++;

                    if (galleryStatus) {
                        galleryStatus.textContent =
                            `${ready} of 5 product previews ready. Choose a product to continue.`;
                    }
                } catch (error) {
                    console.error(`SELFII ${product.name} gallery capture failed:`, error);
                    failed++;
                    if (status) status.textContent = "Preview unavailable";
                }
            }
        } finally {
            if (requestId === mockupRequestId) {
                // Restore the product the customer had selected.
                updateProductPreview();
            }
        }

        if (requestId !== mockupRequestId) return;

        if (galleryStatus) {
            if (ready === 5) {
                galleryStatus.textContent =
                    "All five product previews are ready. Choose a product to continue.";
            } else if (ready === 0) {
                galleryStatus.textContent =
                    "We couldn't capture the product previews. Please try again.";
            } else {
                galleryStatus.textContent =
                    `${ready} of 5 previews ready. ${failed} preview(s) unavailable.`;
            }
        }
    }
    function drawContainedImage(image) {
        const scale = Math.min(
            canvas.width / image.naturalWidth,
            canvas.height / image.naturalHeight
        );

        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;

        context.drawImage(image, x, y, width, height);
    }

    function drawArtwork() {
        if (!artworkReady || !previewImage.naturalWidth) return;

        const position = placements[placementSelect.value] || placements.Front;
        const maxWidth = canvas.width * position.width;
        const maxHeight = 180;

        const scale = Math.min(
            maxWidth / previewImage.naturalWidth,
            maxHeight / previewImage.naturalHeight
        );

        const width = previewImage.naturalWidth * scale;
        const height = previewImage.naturalHeight * scale;
        const x = canvas.width * position.x - width / 2;
        const y = canvas.height * position.y - height / 2;

        const method = getProductionMethod();

        context.save();

        if (method === "dtg") {
            context.globalAlpha = 0.92;
        } else if (method === "screen-print") {
            context.globalAlpha = 1;
        } else {
            context.globalAlpha = 0.96;
            context.shadowColor = "rgba(0, 0, 0, 0.45)";
            context.shadowBlur = 2;
            context.shadowOffsetX = 1;
            context.shadowOffsetY = 1;
        }

        context.drawImage(previewImage, x, y, width, height);
        context.restore();
    }

    function renderCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (!productImage.complete || !productImage.naturalWidth) {
            return;
        }

        drawContainedImage(productImage);
        drawArtwork();
    }

    function updateProductPreview() {
        const product = productSelect.value;
        const use3DPreview = product === "T-shirt";
        const useMug3DPreview = product === "Mug";
        const useCap3DPreview = product === "Cap";
        const useFrame3DPreview = product === "Picture Frame";
        const useTote3DPreview = product === "Tote bag";
        const usePillow3DPreview = product === "Pillow";

        if (canvas) canvas.hidden =
            use3DPreview || useMug3DPreview || useCap3DPreview || useFrame3DPreview || useTote3DPreview || usePillow3DPreview;

        window.SELFII_3D_TSHIRT?.setVisible(use3DPreview);
        window.SELFII_3D_MUG?.setVisible(useMug3DPreview);
        window.SELFII_3D_CAP?.setVisible(useCap3DPreview);
        window.SELFII_3D_FRAME?.setVisible(useFrame3DPreview);
        window.SELFII_3D_TOTE?.setVisible(useTote3DPreview);
        window.SELFII_3D_PILLOW?.setVisible(usePillow3DPreview);

        // Enforce one visible 3D product viewer at a time.
        [
            ["studio3DViewer", use3DPreview],
            ["studio3DMugViewer", useMug3DPreview],
            ["studio3DCapViewer", useCap3DPreview],
            ["studio3DFrameViewer", useFrame3DPreview],
            ["studio3DToteViewer", useTote3DPreview],
            ["studio3DPillowViewer", usePillow3DPreview]
        ].forEach(([id, visible]) => {
            const viewer = document.getElementById(id);
            if (!viewer) return;
            viewer.hidden = !visible;
            viewer.style.display = visible ? "block" : "none";
        });

        if (useMug3DPreview || useFrame3DPreview || useTote3DPreview || usePillow3DPreview) {
            productMockup.hidden = false;
            if (placeholder) placeholder.hidden = true;
            productImage.hidden = true;
            if (dynamicMockupImage) dynamicMockupImage.hidden = true;
            updatePreviewStatus();
            return;
        }

        const image = productImages[product];

        if (!image) {
            if (["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag", "Picture Frame"].includes(product)) {
                productMockup.hidden = false;

                if (placeholder) {
                    placeholder.hidden = true;
                }

                productImage.hidden = true;
                updatePreviewStatus();
                return;
            }

            productMockup.hidden = true;

            if (placeholder) {
                placeholder.hidden = false;
                placeholder.innerHTML = `
                    <i class="fa-solid fa-shirt"></i>
                    <h3>${product} preview coming soon</h3>
                    <p>Your selected product will receive its own mockup.</p>
                `;
            }

            updatePreviewStatus();
            return;
        }

        productMockup.hidden = false;

        if (placeholder) {
            placeholder.hidden = true;
        }

        productImage.onload = renderCanvas;
        productImage.onerror = () => {
            console.error("SELFII: Could not load product mockup:", image);
            if (previewStatus) {
                previewStatus.textContent = "Could not load product mockup";
            }
        };

        if (productImage.getAttribute("src") !== image) {
            productImage.src = image;
        } else if (productImage.complete && productImage.naturalWidth) {
            renderCanvas();
        }

        updatePreviewStatus();
    }

    artworkInput.addEventListener("change", async () => {
        const file = artworkInput.files?.[0];
        if (!file) return;

        const faceCheckId = ++faceCheckRequestId;
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            artworkInput.value = "";
            alert("Please select a JPG, PNG or WEBP image.");
            return;
        }

        if (file.size === 0 || file.size > 5 * 1024 * 1024) {
            artworkInput.value = "";
            alert("Please select a valid image no larger than 5 MB.");
            return;
        }

        uploadedArtwork = null;
        artworkReady = false;
        mockupRequestId++;

        if (faceCheckStatus) {
            faceCheckStatus.textContent = "Checking your photo for a visible face...";
        }
        if (fileName) fileName.textContent = file.name;

        try {
            if (typeof window.SELFII_detectFace !== "function") {
                throw new Error("The face-check service is unavailable.");
            }

            const hasFace = await window.SELFII_detectFace(file);

            if (faceCheckId !== faceCheckRequestId) return;

            if (!hasFace) {
                artworkInput.value = "";
                if (faceCheckStatus) {
                    faceCheckStatus.textContent =
                        "No clear face was detected. Please upload a selfie with your face visible.";
                }
                if (fileName) fileName.textContent = "No selfie uploaded yet.";
                return;
            }

            uploadedArtwork = file;

            if (faceCheckStatus) {
                faceCheckStatus.textContent =
                    "Face detected. Your selfie has passed the photo check.";
            }

            if (previewURL) URL.revokeObjectURL(previewURL);
            previewURL = URL.createObjectURL(file);

            previewImage.onload = () => {
                artworkReady = true;
                renderCanvas();
                window.SELFII_3D_TSHIRT?.setArtwork(file);
                window.SELFII_3D_MUG?.setArtwork(file);
                window.SELFII_3D_CAP?.setArtwork(file);
                window.SELFII_3D_FRAME?.setArtwork(file);
                window.SELFII_3D_TOTE?.setArtwork(file);
                window.SELFII_3D_PILLOW?.setArtwork(file);

                renderAllDynamicMockups(file);
                updatePreviewStatus();
            };

            previewImage.onerror = () => {
                uploadedArtwork = null;
                artworkReady = false;
                if (faceCheckStatus) {
                    faceCheckStatus.textContent =
                        "The photo could not be loaded. Please try another image.";
                }
            };

            previewImage.src = previewURL;
            previewImage.hidden = true;

            if (placeholder) placeholder.hidden = true;
            updatePreviewStatus();

            console.log("SELFII selfie passed face detection:", file.name);
        } catch (error) {
            if (faceCheckId !== faceCheckRequestId) return;

            console.error("SELFII face detection failed:", error);
            uploadedArtwork = null;
            artworkReady = false;
            artworkInput.value = "";

            if (faceCheckStatus) {
                faceCheckStatus.textContent =
                    "We couldn't verify this photo. Check your connection and try again.";
            }
            if (fileName) fileName.textContent = "No selfie uploaded yet.";
        }
    });

    productSelect.addEventListener("change", () => {
        updateProductPreview();

        document.querySelectorAll(".studio-gallery-card").forEach((card) => {
            card.classList.toggle(
                "is-selected",
                card.dataset.product === productSelect.value
            );
        });

        updatePreviewStatus();
    });

    document.querySelectorAll("[data-select-product]").forEach((button) => {
        button.addEventListener("click", () => {
            if (!uploadedArtwork) {
                alert("Please upload a selfie and wait for the face check first.");
                artworkInput.click();
                return;
            }

            productSelect.value = button.dataset.selectProduct;
            productSelect.dispatchEvent(new Event("change", { bubbles: true }));

            // T-shirt customers see the interactive 3D design preview first.
            if (["T-shirt", "Mug", "Cap", "Picture Frame", "Tote bag", "Pillow"].includes(button.dataset.selectProduct)) {
                if (previewPanel) previewPanel.hidden = false;
                if (orderPanel) orderPanel.hidden = true;
                if (submitButton) submitButton.hidden = false;

                previewPanel?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
                return;
            }

            // Keep the existing order flow for the other products.
            if (!orderPanel || !orderForm) {
                alert("The customer details form could not be loaded.");
                return;
            }

            orderPanel.hidden = false;
            if (submitButton) submitButton.hidden = true;
            orderPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    placementSelect.addEventListener("change", () => {
        renderCanvas();
        updatePreviewStatus();
    });

    document.querySelectorAll(
        'input[name="studioPrintStyle"], input[name="studioProductionMethod"]'
    ).forEach((radio) => {
        radio.addEventListener("change", () => {
            renderCanvas();
            updatePreviewStatus();
        });
    });

    submitButton?.addEventListener("click", () => {
        if (!uploadedArtwork) {
            alert("Please upload your artwork before continuing.");
            artworkInput.click();
            return;
        }

        if (!orderPanel || !orderForm) {
            alert("The customer details form could not be loaded.");
            return;
        }

        orderPanel.hidden = false;
        submitButton.hidden = true;
        orderPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    backButton?.addEventListener("click", () => {
        if (orderPanel) {
            orderPanel.hidden = true;
        }

        if (gallery) {
            gallery.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });


    orderForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const status = document.getElementById("studioOrderStatus");
        const orderSubmit = document.getElementById("studioOrderSubmit");

        if (!uploadedArtwork) {
            status.textContent = "Please upload your artwork before submitting.";
            return;
        }

        if (!orderForm.reportValidity()) return;

        const selectedMethod = getProductionMethod();
        const designDetails = [
            `Print method: ${methodLabels[selectedMethod] || "DTG printing"}`,
            `Additional instructions: ${document.getElementById("studioDesignDetails").value.trim()}`
        ].join("\n");

        const formData = new FormData();

        formData.append("artwork", uploadedArtwork);
        formData.append("customerName", document.getElementById("studioCustomerName").value.trim());
        formData.append("customerEmail", document.getElementById("studioCustomerEmail").value.trim());
        formData.append("customerPhone", document.getElementById("studioCustomerPhone").value.trim());
        formData.append("item", productSelect.value);
        formData.append("supplyOption", document.getElementById("studioSupplyOption").value);
        formData.append("placement", placementSelect.value);
        formData.append("purpose", document.getElementById("studioPurpose").value);
        formData.append("quantity", document.getElementById("studioQuantity").value);
        formData.append("designDetails", designDetails);

        const preferredDate = document.getElementById("studioPreferredDate").value;

        if (preferredDate) {
            formData.append("preferredDate", preferredDate);
        }

        const originalButtonText = orderSubmit.textContent;

        orderSubmit.disabled = true;
        orderSubmit.textContent = "Submitting...";
        status.textContent = "Uploading your artwork and submitting your print request...";

        try {
            const response = await fetch(
                `${window.SELFII_API_URL}/print-requests`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Your print request could not be submitted."
                );
            }

            const requestId = result.request?._id || result.request?.id;

            status.textContent = requestId
                ? `Your print request was submitted successfully. Reference: ${requestId}`
                : "Your print request was submitted successfully. SELFII will contact you soon.";

            orderSubmit.textContent = "Request submitted";
        } catch (error) {
            console.error("SELFII print request submission failed:", error);
            status.textContent = error.message || "Something went wrong. Please try again.";
            orderSubmit.disabled = false;
            orderSubmit.textContent = originalButtonText;
        }
    });

    updateProductPreview();

    window.addEventListener("beforeunload", () => {
        if (previewURL) {
            URL.revokeObjectURL(previewURL);
        }
    });

    console.log("SELFII Canvas Design Studio initialized.");
})();
