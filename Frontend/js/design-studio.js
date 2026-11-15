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

    async function generateDynamicMockup(file) {
        const product = productSelect.value;

        if (!dynamicMockupImage || !["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag"].includes(product)) {
            return;
        }

        const requestId = ++mockupRequestId;

        setMockupLoading(
            true,
            "Uploading your artwork...",
            "Please wait while we prepare your realistic mockup."
        );

        dynamicMockupImage.hidden = true;
        dynamicMockupImage.removeAttribute("src");
        canvas.style.display = "none";
        productImage.hidden = true;

        if (previewStatus) {
            previewStatus.textContent = `Generating realistic ${product} preview...`;
        }

        try {
            const formData = new FormData();
            formData.append("artwork", file);
            formData.append("product", product);

            const response = await fetch(
                `${window.SELFII_API_URL}/dynamic-mockups/render`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (requestId !== mockupRequestId) return;

            if (!response.ok || !result.success || !result.previewUrl) {
                throw new Error(
                    result.message || "The realistic preview could not be generated."
                );
            }

            setMockupLoading(
                true,
                "Your mockup is ready...",
                "Loading your finished preview."
            );

            dynamicMockupImage.onload = () => {
                if (requestId !== mockupRequestId) return;

                setMockupLoading(false);
                dynamicMockupImage.hidden = false;
                canvas.style.display = "none";
                productImage.hidden = true;

                if (previewStatus) {
                    previewStatus.textContent = `Realistic ${product} preview ready`;
                }
            };

            dynamicMockupImage.onerror = () => {
                if (requestId !== mockupRequestId) return;

                setMockupLoading(false);
                dynamicMockupImage.hidden = true;
                canvas.style.display = "block";

                if (previewStatus) {
                    previewStatus.textContent = "Could not load realistic preview";
                }
            };

            dynamicMockupImage.src = result.previewUrl;

        } catch (error) {
            if (requestId !== mockupRequestId) return;

            console.error("SELFII Dynamic Mockups error:", error);

            setMockupLoading(false);
            dynamicMockupImage.hidden = true;
            canvas.style.display = "block";

            if (previewStatus) {
                previewStatus.textContent = "Realistic preview unavailable";
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
        const image = productImages[product];

        if (!image) {
            if (["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag"].includes(product)) {
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

    artworkInput.addEventListener("change", () => {
        const file = artworkInput.files?.[0];
        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

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

        uploadedArtwork = file;
        artworkReady = false;

        if (previewURL) {
            URL.revokeObjectURL(previewURL);
        }

        previewURL = URL.createObjectURL(file);

        previewImage.onload = () => {
            artworkReady = true;
            renderCanvas();
            updatePreviewStatus();
        };

        previewImage.onerror = () => {
            artworkReady = false;
            alert("The selected image could not be loaded. Please try another image.");
        };

        previewImage.src = previewURL;

        if (["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag"].includes(productSelect.value)) {
            generateDynamicMockup(file);
        }
        previewImage.hidden = true;

        if (fileName) {
            fileName.textContent = file.name;
        }

        updatePreviewStatus();

        console.log("SELFII artwork selected:", file.name);
    });

    productSelect.addEventListener("change", () => {
        mockupRequestId++;
        setMockupLoading(false);
        updateProductPreview();

        if (["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag"].includes(productSelect.value) && uploadedArtwork) {
            generateDynamicMockup(uploadedArtwork);
        } else if (dynamicMockupImage) {
            dynamicMockupImage.hidden = true;

            const usesExternalMockup = ["T-shirt", "Hoodie", "Cap", "Mug", "Tote bag"].includes(productSelect.value);
            canvas.style.display = usesExternalMockup ? "none" : "block";
            productImage.hidden = usesExternalMockup;
        }
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

        if (submitButton) {
            submitButton.hidden = false;
            submitButton.scrollIntoView({ behavior: "smooth", block: "center" });
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
        const selectedStyle = getPrintStyle();

        const styleLabel = selectedStyle === "full-photo"
            ? "Full photo"
            : "Background removal requested";

        const designDetails = [
            `Print method: ${methodLabels[selectedMethod] || "DTG printing"}`,
            `Print style: ${styleLabel}`,
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
