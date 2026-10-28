"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.SELFII_API_URL ||
        (["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "http://localhost:5000/api"
            : "/api");

    const $ = id => document.getElementById(id);

    const loading = $("productLoading");
    const errorPanel = $("productError");
    const errorTitle = $("productErrorTitle");
    const errorText = $("productErrorText");
    const details = $("productDetails");
    const mainImage = $("productMainImage");
    const imageWrapper = mainImage?.closest(".product-main-image");
    const thumbnails = $("productThumbnails");
    const featuredBadge = $("productFeaturedBadge");
    const categoryElement = $("productCategory");
    const nameElement = $("productName");
    const priceElement = $("productPrice");
    const descriptionElement = $("productDescription");
    const stockElement = $("productStock");
    const stockDot = $("productStockDot");
    const breadcrumb = $("breadcrumbProduct");
    const quantityInput = $("productQuantity");
    const decreaseButton = $("decreaseQuantity");
    const increaseButton = $("increaseQuantity");
    const addButton = $("addProductToCart");
    const notice = $("productNotice");
    const yearElement = $("productYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    let currentProduct = null;
    let currentStock = 0;

    function formatPrice(value) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function getCategoryName(category) {
        const names = {
            boutique: "SELFII Boutique",
            selfiitees: "Selfiitees",
            printing: "Print Selfii"
        };

        return names[category] || "SELFII UNIVERSE";
    }

    function showNotice(message, isError = false) {
        if (!notice) return;

        notice.textContent = message;
        notice.hidden = !message;
        notice.style.color = isError ? "#B3261E" : "";
    }

    function showError(title, message) {
        if (loading) loading.hidden = true;
        if (details) details.hidden = true;

        if (errorTitle) errorTitle.textContent = title;
        if (errorText) errorText.textContent = message;
        if (errorPanel) errorPanel.hidden = false;

        document.title = `${title} | SELFII UNIVERSE`;
    }

    function setMainImage(url, alt) {
        if (!mainImage || !imageWrapper) return;

        imageWrapper.classList.remove("image-unavailable");

        if (!url) {
            mainImage.removeAttribute("src");
            mainImage.alt = "Product image unavailable";
            imageWrapper.classList.add("image-unavailable");
            return;
        }

        mainImage.onerror = () => {
            mainImage.removeAttribute("src");
            imageWrapper.classList.add("image-unavailable");
        };

        mainImage.src = url;
        mainImage.alt = alt || "SELFII UNIVERSE product";
    }

    function renderGallery(product) {
        if (!mainImage || !thumbnails) return;

        const images = [
            product.image,
            ...(Array.isArray(product.images) ? product.images : [])
        ].filter((url, index, all) =>
            typeof url === "string" &&
            /^https:\/\//i.test(url.trim()) &&
            all.indexOf(url) === index
        );

        thumbnails.replaceChildren();
        setMainImage(images[0] || "", product.name);

        images.forEach((url, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "product-thumbnail";
            button.classList.toggle("active", index === 0);
            button.setAttribute("aria-label", `View image ${index + 1}`);
            button.setAttribute("aria-pressed", String(index === 0));

            const image = document.createElement("img");
            image.src = url;
            image.alt = `${product.name} image ${index + 1}`;
            image.loading = "lazy";

            image.onerror = () => button.remove();

            button.appendChild(image);

            button.addEventListener("click", () => {
                setMainImage(url, product.name);

                thumbnails.querySelectorAll(".product-thumbnail")
                    .forEach(item => {
                        const active = item === button;
                        item.classList.toggle("active", active);
                        item.setAttribute("aria-pressed", String(active));
                    });
            });

            thumbnails.appendChild(button);
        });
    }

    function renderProduct(product) {
        currentProduct = product;
        currentStock = Math.max(
            0,
            Math.floor(Number(product.stock) || 0)
        );

        document.title = `${product.name || "Product"} | SELFII UNIVERSE`;

        if (categoryElement) {
            categoryElement.textContent = getCategoryName(product.category);
        }

        if (nameElement) {
            nameElement.textContent = product.name || "Product";
        }

        if (priceElement) {
            priceElement.textContent = formatPrice(product.price);
        }

        if (descriptionElement) {
            descriptionElement.textContent =
                product.description || "Contact us for more product information.";
        }

        if (breadcrumb) {
            breadcrumb.textContent = product.name || "Product";
        }

        if (featuredBadge) {
            featuredBadge.hidden = !product.featured;
        }

        if (stockElement) {
            if (currentStock === 0) {
                stockElement.textContent = "Currently out of stock";
            } else if (currentStock <= 5) {
                stockElement.textContent = `Only ${currentStock} left in stock`;
            } else {
                stockElement.textContent = "In stock";
            }
        }

        if (stockDot) {
            stockDot.classList.toggle("out-of-stock", currentStock === 0);
        }

        if (quantityInput) {
            quantityInput.min = "1";
            quantityInput.max = String(Math.max(1, currentStock));
            quantityInput.value = "1";
            quantityInput.disabled = currentStock === 0;
        }

        if (decreaseButton) decreaseButton.disabled = currentStock === 0;
        if (increaseButton) increaseButton.disabled = currentStock === 0;

        if (addButton) {
            addButton.disabled = currentStock === 0;
            addButton.textContent = currentStock === 0
                ? "Out of Stock"
                : "Add to Cart";
        }

        renderGallery(product);

        if (loading) loading.hidden = true;
        if (errorPanel) errorPanel.hidden = true;
        if (details) details.hidden = false;
    }

    function getQuantity() {
        if (!quantityInput || currentStock < 1) return 0;

        let quantity = Math.floor(Number(quantityInput.value));

        if (!Number.isFinite(quantity) || quantity < 1) {
            quantity = 1;
        }

        if (quantity > currentStock) {
            quantity = currentStock;
            showNotice(`Only ${currentStock} item(s) are available.`, true);
        }

        quantityInput.value = String(quantity);
        return quantity;
    }

    function changeQuantity(amount) {
        if (!quantityInput || currentStock < 1) return;

        const current = Math.floor(Number(quantityInput.value)) || 1;
        quantityInput.value = String(
            Math.max(1, Math.min(currentStock, current + amount))
        );

        showNotice("");
    }

    async function loadProduct() {
        const slug = new URLSearchParams(window.location.search).get("slug");

        if (!slug || !slug.trim()) {
            showError(
                "Product not selected",
                "Return to the shop and select a product to view its details."
            );
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/products/${encodeURIComponent(slug.trim())}`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (response.status === 404) {
                showError(
                    "Product not found",
                    "This product may have been removed or is no longer available."
                );
                return;
            }

            if (!response.ok || data.success !== true || !data.product) {
                throw new Error(data.message || "Product could not be loaded.");
            }

            renderProduct(data.product);
        } catch (error) {
            console.error("Product details error:", error);

            showError(
                "Unable to load product",
                "Please check your connection and try again."
            );
        }
    }

    if (decreaseButton) {
        decreaseButton.addEventListener("click", () => changeQuantity(-1));
    }

    if (increaseButton) {
        increaseButton.addEventListener("click", () => changeQuantity(1));
    }

    if (quantityInput) {
        quantityInput.addEventListener("change", getQuantity);
        quantityInput.addEventListener("input", () => showNotice(""));
    }

    if (addButton) {
        addButton.addEventListener("click", () => {
            if (!currentProduct || currentStock < 1) return;

            const cartAPI = window.SelfiiCart;

            if (!cartAPI || typeof cartAPI.addItem !== "function") {
                showNotice("Your cart could not be loaded. Please refresh.", true);
                return;
            }

            const id = currentProduct._id ||
                currentProduct.id ||
                currentProduct.slug;

            if (!id) {
                showNotice("This product has no valid identifier.", true);
                return;
            }

            const quantity = getQuantity();
            if (!quantity) return;

            const cart = typeof cartAPI.getCart === "function"
                ? cartAPI.getCart()
                : [];

            const existing = cart.find(item => String(item.id) === String(id));
            const alreadyInCart = existing
                ? Math.max(0, Number(existing.quantity) || 0)
                : 0;

            if (alreadyInCart + quantity > currentStock) {
                showNotice(
                    `You already have ${alreadyInCart} in your cart. ` +
                    `Only ${currentStock} item(s) are available in total.`,
                    true
                );
                return;
            }

            for (let i = 0; i < quantity; i++) {
                const added = cartAPI.addItem({
                    id,
                    name: currentProduct.name,
                    price: currentProduct.price,
                    image: currentProduct.image ||
                        currentProduct.images?.[0] || "",
                    category: getCategoryName(currentProduct.category),
                    description: currentProduct.description || ""
                });

                if (!added) {
                    showNotice("We couldn't update your cart. Please try again.", true);
                    return;
                }
            }

            if (typeof cartAPI.updateCartCount === "function") {
                cartAPI.updateCartCount();
            }

            showNotice(
                `${quantity} ${quantity === 1 ? "item" : "items"} added to your cart.`
            );

            addButton.textContent = "Added to Cart ✓";

            window.setTimeout(() => {
                if (addButton.isConnected && currentProduct) {
                    addButton.textContent = "Add to Cart";
                }
            }, 1500);
        });
    }

    loadProduct();
});
