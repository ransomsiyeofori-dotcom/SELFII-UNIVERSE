"use strict";

(() => {
    const API_BASE = window.SELFII_API_URL ||
        (["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "http://localhost:5000/api"
            : "https://selfii-universe-api.onrender.com/api");

    const grid = document.getElementById("printSelfiiProductGrid");
    const status = document.getElementById("printSelfiiStatus");
    const emptyState = document.getElementById("printSelfiiEmpty");
    const sortSelect = document.getElementById("printSelfiiSort");
    const clearSearchButton = document.getElementById("clearPrintSelfiiSearch");
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const footerYear = document.getElementById("footerYear");

    if (!grid || !status || !emptyState) return;

    let products = [];
    let searchTerm = "";
    let requestNumber = 0;

    if (footerYear) {
        footerYear.textContent = String(new Date().getFullYear());
    }

    function formatPrice(value) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function getProductId(product) {
        return product._id || product.id || product.slug;
    }

    function getFilteredProducts() {
        const query = searchTerm.trim().toLowerCase();

        const result = products.filter(product => {
            const searchableText = [
                product.name,
                product.description,
                product.category
            ].join(" ").toLowerCase();

            return searchableText.includes(query);
        });

        switch (sortSelect?.value) {
            case "newest":
                result.sort((a, b) =>
                    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                );
                break;

            case "price-low":
                result.sort((a, b) => Number(a.price) - Number(b.price));
                break;

            case "price-high":
                result.sort((a, b) => Number(b.price) - Number(a.price));
                break;

            case "name":
                result.sort((a, b) =>
                    String(a.name).localeCompare(String(b.name))
                );
                break;

            default:
                result.sort((a, b) =>
                    Number(Boolean(b.featured)) - Number(Boolean(a.featured))
                );
        }

        return result;
    }

    function renderProduct(product) {
        const card = createElement("article", "boutique-product-card");
        const imageWrapper = createElement("div", "boutique-product-image");
        const imageLink = createElement("a");
        const image = createElement("img");

        image.src = product.image;
        image.alt = product.name || "SELFII Boutique product";
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("error", () => {
            imageWrapper.replaceChildren(
                createElement("div", "boutique-image-fallback", "SELFII UNIVERSE")
            );
        }, { once: true });

        imageLink.href = `product.html?slug=${encodeURIComponent(product.slug || "")}`;
        imageLink.setAttribute("aria-label", `View ${product.name}`);
        imageLink.appendChild(image);
        imageWrapper.appendChild(imageLink);

        if (product.featured) {
            imageWrapper.appendChild(
                createElement("span", "boutique-product-badge", "Featured")
            );
        }

        const info = createElement("div", "boutique-product-info");
        const category = createElement(
            "p",
            "boutique-product-category",
            product.category || "Boutique"
        );
        const name = createElement("h3", "boutique-product-name");
        const nameLink = createElement("a", "", product.name);

        nameLink.href = imageLink.href;
        name.appendChild(nameLink);

        info.append(category, name);

        if (product.description) {
            info.appendChild(
                createElement(
                    "p",
                    "boutique-product-description",
                    product.description
                )
            );
        }

        const bottom = createElement("div", "boutique-product-bottom");
        const price = createElement(
            "span",
            "boutique-product-price",
            formatPrice(product.price)
        );

        const addButton = createElement(
            "button",
            "boutique-add-button",
            "Add to bag"
        );

        addButton.type = "button";

        const stock = Number(product.stock);
        const outOfStock = !Number.isFinite(stock) || stock <= 0;

        if (outOfStock) {
            addButton.disabled = true;
            addButton.textContent = "Out of stock";
        }

        addButton.addEventListener("click", () => {
            const cart = window.SelfiiCart;

            if (!cart || typeof cart.addItem !== "function") {
                status.textContent =
                    "The shopping cart could not be loaded. Please refresh the page.";
                return;
            }

            const added = cart.addItem({
                id: getProductId(product),
                name: product.name,
                price: product.price,
                image: product.image,
                category: product.category,
                description: product.description
            });

            if (added) {
                addButton.textContent = "Added to bag ✓";
                status.textContent = `${product.name} added to your bag.`;

                window.setTimeout(() => {
                    if (addButton.isConnected && !addButton.disabled) {
                        addButton.textContent = "Add to bag";
                    }
                }, 1600);
            } else {
                status.textContent =
                    "We couldn't add this product to your bag. Please try again.";
            }
        });

        bottom.append(price, addButton);
        info.appendChild(bottom);
        card.append(imageWrapper, info);

        return card;
    }

    function renderProducts() {
        const filtered = getFilteredProducts();
        grid.replaceChildren();

        for (const product of filtered) {
            grid.appendChild(renderProduct(product));
        }

        emptyState.hidden = filtered.length > 0;

        if (products.length === 0) {
            status.textContent = "No printing products are available yet.";
        } else if (filtered.length === 0) {
            status.textContent = "No products match your search.";
        } else {
            status.textContent =
                `${filtered.length} ${filtered.length === 1 ? "product" : "products"} available`;
        }
    }

    async function loadProducts() {
        const currentRequest = ++requestNumber;

        status.textContent = "Loading printing products...";
        emptyState.hidden = true;
        grid.replaceChildren();

        try {
            const response = await fetch(
                `${API_BASE}/products?category=printing&limit=50`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success !== true) {
                throw new Error(data.message || "Unable to load printing products.");
            }

            if (currentRequest !== requestNumber) return;

            products = Array.isArray(data.products) ? data.products : [];
            renderProducts();
        } catch (error) {
            if (currentRequest !== requestNumber) return;

            console.error("Boutique products error:", error);
            products = [];
            grid.replaceChildren();
            emptyState.hidden = false;
            status.textContent =
                "We couldn't load the boutique right now. Please try again.";

            const message = emptyState.querySelector("p");
            if (message) {
                message.textContent =
                    "Check your connection and try again in a moment.";
            }

            const heading = emptyState.querySelector("h3");
            if (heading) heading.textContent = "Unable to load products";

            const button = emptyState.querySelector("button");
            if (button) button.textContent = "Try again";
        }
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", renderProducts);
    }

    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", event => {
            event.preventDefault();
            searchTerm = searchInput.value.trim();
            renderProducts();

            document.getElementById("printSelfiiProducts")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            searchTerm = "";

            if (products.length === 0) {
                loadProducts();
            } else {
                renderProducts();
            }
        });
    }

    loadProducts();
})();
