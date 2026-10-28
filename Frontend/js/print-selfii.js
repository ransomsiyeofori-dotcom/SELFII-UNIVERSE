/* =========================================
   PRINT SELFII — SERVICE REQUEST INTERACTIONS
   ========================================= */

(() => {
    "use strict";

    const API_BASE_URL = (
        window.SELFII_API_URL ||
        "/api"
    ).replace(/\/+$/, "");

    const prices = {
        "T-shirt": { "customer-item": 3000, "selfii-item": 6000 },
        "Hoodie": { "customer-item": 5000, "selfii-item": 12000 },
        "Polo shirt": { "customer-item": 3500, "selfii-item": 7000 },
        "Mug": { "customer-item": 2500, "selfii-item": 4500 },
        "Tote bag": { "customer-item": 2000, "selfii-item": 4000 },
        "Cap": { "customer-item": 2000, "selfii-item": 4000 },
        "Jersey": { "customer-item": 3500, "selfii-item": 7500 },
        "Other item": { "customer-item": null, "selfii-item": null }
    };

    const form = document.getElementById("printRequestForm");
    if (!form) return;

    const serviceGrid = document.getElementById("printServiceGrid");
    const itemSelect = document.getElementById("printItem");
    const supplySelect = document.getElementById("printSupplyOption");
    const quantityInput = document.getElementById("printQuantity");
    const artworkInput = document.getElementById("printArtwork");
    const designInput = document.getElementById("printDesign");
    const onlyPrice = document.getElementById("printingOnlyPrice");
    const suppliedPrice = document.getElementById("itemAndPrintingPrice");
    const feedback = document.getElementById("printFormFeedback");
    const submitButton = document.getElementById("printSubmitButton");
    const optionButtons = document.querySelectorAll("[data-print-option]");
    const priceCards = document.querySelectorAll(".print-price-card");

    let isSubmitting = false;

    const formatNaira = (amount) =>
        new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(amount);

    function showFeedback(message, type = "error") {
        if (!feedback) return;

        feedback.textContent = message;
        feedback.hidden = false;
        feedback.classList.add("is-visible");
        feedback.classList.toggle("is-error", type === "error");
        feedback.classList.toggle("is-success", type === "success");

        feedback.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearFeedback() {
        if (!feedback) return;

        feedback.textContent = "";
        feedback.hidden = true;
        feedback.classList.remove(
            "is-visible",
            "is-error",
            "is-success"
        );
    }

    function getPrice(item, option) {
        return prices[item]?.[option] ?? null;
    }

    function updateServiceCards() {
        if (!serviceGrid) return;

        serviceGrid.querySelectorAll("[data-item]").forEach((card) => {
            const selected = card.dataset.item === itemSelect.value;

            card.classList.toggle("is-selected", selected);
            card.setAttribute("aria-pressed", String(selected));
        });
    }

    function updatePricing() {
        const item = itemSelect.value;
        const option = supplySelect.value;
        const quantity = Math.max(1, Number(quantityInput.value) || 1);

        const printingOnly = getPrice(item, "customer-item");
        const itemAndPrinting = getPrice(item, "selfii-item");

        if (onlyPrice) {
            onlyPrice.textContent = printingOnly === null
                ? "Request a quote"
                : `${formatNaira(printingOnly)} starting from`;
        }

        if (suppliedPrice) {
            suppliedPrice.textContent = itemAndPrinting === null
                ? "Request a quote"
                : `${formatNaira(itemAndPrinting)} starting from`;
        }

        optionButtons.forEach((button) => {
            const selected = button.dataset.printOption === option;

            button.setAttribute("aria-pressed", String(selected));

            const card = button.closest(".print-price-card");
            if (card) card.classList.toggle("is-selected", selected);
        });

        priceCards.forEach((card) => {
            const button = card.querySelector("[data-print-option]");
            if (!button) return;

            card.classList.toggle(
                "is-selected",
                button.dataset.printOption === option
            );
        });

        updateServiceCards();

        const estimate = getPrice(item, option);
        const total = document.getElementById("printEstimatedTotal");
        const estimateNote = document.getElementById("printEstimateNote");

        if (total) {
            total.textContent = estimate === null
                ? "Quote required"
                : formatNaira(estimate * quantity);
        }

        if (estimateNote) {
            estimateNote.textContent = estimate === null
                ? "SELFII will review this item and provide a quote."
                : "Provisional estimate only; final pricing will be confirmed.";
        }
    }

    function selectItem(item) {
        if (!prices[item]) return;

        itemSelect.value = item;
        clearFeedback();
        updatePricing();
    }

    if (serviceGrid) {
        serviceGrid.addEventListener("click", (event) => {
            const card = event.target.closest("[data-item]");

            if (!card || !serviceGrid.contains(card)) return;

            selectItem(card.dataset.item);
        });
    }

    itemSelect.addEventListener("change", () => {
        clearFeedback();
        updatePricing();
    });

    supplySelect.addEventListener("change", () => {
        clearFeedback();
        updatePricing();
    });

    quantityInput.addEventListener("input", () => {
        clearFeedback();
        updatePricing();
    });

    optionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            supplySelect.value = button.dataset.printOption;
            clearFeedback();
            updatePricing();

            const requestSection = document.getElementById("print-request");

            if (requestSection) {
                requestSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

    if (artworkInput) {
        artworkInput.addEventListener("change", () => {
            clearFeedback();

            const file = artworkInput.files?.[0];
            if (!file) return;

            const allowedExtensions = /\.(png|jpe?g|webp|pdf)$/i;
            const maxBytes = 5 * 1024 * 1024;

            if (!allowedExtensions.test(file.name)) {
                artworkInput.value = "";
                showFeedback(
                    "Please select a PNG, JPG, WEBP, or PDF artwork file."
                );
                return;
            }

            if (file.size > maxBytes) {
                artworkInput.value = "";
                showFeedback(
                    "Your artwork is larger than 5 MB. Please choose a smaller file."
                );
                return;
            }

            if (file.size === 0) {
                artworkInput.value = "";
                showFeedback(
                    "The selected file is empty. Please choose another file."
                );
                return;
            }

            showFeedback(
                `Artwork selected: ${file.name}. It will be uploaded when you submit the request.`,
                "success"
            );
        });
    }

    form.addEventListener("input", clearFeedback);
    form.addEventListener("change", clearFeedback);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        clearFeedback();

        if (!form.checkValidity()) {
            form.reportValidity();
            showFeedback("Please complete all required fields before continuing.");
            return;
        }

        const quantity = Number(quantityInput.value);

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
            showFeedback(
                "Please enter a whole-number quantity between 1 and 10,000."
            );
            quantityInput.focus();
            return;
        }

        const designDescription = designInput.value.trim();

        if (designDescription.length < 10) {
            showFeedback("Please describe your design in at least 10 characters.");
            designInput.focus();
            return;
        }

        const preferredDate =
            document.getElementById("printDeadline")?.value || "";

        if (preferredDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const chosenDate = new Date(`${preferredDate}T00:00:00`);

            if (Number.isNaN(chosenDate.getTime()) || chosenDate < today) {
                showFeedback("Please choose today or a future preferred date.");
                return;
            }
        }

        const artwork = artworkInput?.files?.[0];

        if (artwork && artwork.size > 5 * 1024 * 1024) {
            showFeedback("Your artwork must not exceed 5 MB.");
            return;
        }

        /*
         * Map the HTML field names to the backend's expected field names.
         * The file must be appended as "artwork" for the Multer route.
         */
        const payload = new FormData();

        payload.append(
            "customerName",
            document.getElementById("printName").value.trim()
        );
        payload.append(
            "customerEmail",
            document.getElementById("printEmail").value.trim()
        );
        payload.append(
            "customerPhone",
            document.getElementById("printPhone").value.trim()
        );
        payload.append("item", itemSelect.value);
        payload.append("supplyOption", supplySelect.value);
        payload.append("quantity", String(quantity));
        payload.append(
            "placement",
            document.getElementById("printPlacement").value
        );
        payload.append(
            "purpose",
            document.getElementById("printPurpose").value
        );
        payload.append("designDetails", designDescription);
        payload.append("preferredDate", preferredDate);

        if (artwork) {
            payload.append("artwork", artwork, artwork.name);
        }

        isSubmitting = true;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
            submitButton.dataset.originalText =
                submitButton.textContent.trim();
            submitButton.textContent = "Submitting request...";
        }

        try {
            const response = await fetch(`${API_BASE_URL}/print-requests`, {
                method: "POST",
                body: payload,
                credentials: "include"
            });

            let result;

            try {
                result = await response.json();
            } catch {
                result = {};
            }

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.message ||
                    "We couldn't submit your request. Please try again."
                );
            }

            form.reset();
            clearFeedback();
            updatePricing();

            const requestReference =
                result.request?.reference ||
                result.request?.id ||
                result.requestId ||
                result.id;

            const referenceMessage = requestReference
                ? ` Your reference is ${requestReference}.`
                : "";

            showFeedback(
                `Your printing request has been submitted successfully.${referenceMessage} SELFII will review your details and contact you about the final quote. This is a request, not a confirmed order.`,
                "success"
            );
        } catch (error) {
            console.error("PRINT SELFII submission error:", error);

            showFeedback(
                error.message ||
                "We couldn't submit your request. Please try again, or email selfiitees@gmail.com if the problem continues."
            );
        } finally {
            isSubmitting = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.removeAttribute("aria-busy");

                const originalText = submitButton.dataset.originalText;

                if (originalText) {
                    submitButton.innerHTML = "";
                    submitButton.append(
                        document.createTextNode("Send printing request")
                    );

                    const icon = document.createElement("i");
                    icon.className = "fa-solid fa-arrow-right";
                    submitButton.append(" ", icon);
                }
            }
        }
    });

    updatePricing();
})();
