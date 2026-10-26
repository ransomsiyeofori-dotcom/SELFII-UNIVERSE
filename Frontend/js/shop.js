"use strict";

/* ========================================
   SELFII UNIVERSE — LIVE SHOP
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.SELFII_API_URL ||
        (["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "http://localhost:5000/api"
            : "https://selfii-universe-api.onrender.com/api");

    const productGrid = document.getElementById("shopProductGrid");
    const categoryButtons = document.querySelectorAll(".category-btn");
    const searchForm = document.getElementById("shopSearchForm");
    const searchInput = document.getElementById("shopSearch");
    const sortSelect = document.getElementById("sortProducts");
    const productCount = document.getElementById("productCount");
    const emptyState = document.getElementById("shopEmptyState");
    const resetButton = document.getElementById("resetShopFilters");

    if (!productGrid) return;

    let products = [];
    let activeCategory = "all";
    let searchTerm = "";
    let sortMode = sortSelect?.value || "featured";

    function formatPrice(price) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(price) || 0);
    }

    function getProductId(product) {
        return product._id || product.id || product.slug;
    }

    function getCategoryName(category) {
        const names = {
            boutique: "SELFII Boutique",
            selfiitees: "Selfiitees",
            printing: "Print Selfii"
        };

        return names[category] || "SELFII UNIVERSE";
    }

    function getFilteredProducts() {
        const query = searchTerm.toLowerCase();

        const filtered = products.filter(product => {
            const matchesCategory =
                activeCategory === "all" ||
                product.category === activeCategory;

            const searchableText = [
                product.name,
                product.description,
                getCategoryName(product.category),
                product.category
            ].join(" ").toLowerCase();

            return matchesCategory && searchableText.includes(query);
        });

        switch (sortMode) {
            case "name":
                filtered.sort((a, b) =>
                    String(a.name).localeCompare(String(b.name))
                );
                break;

            case "price-low":
                filtered.sort((a, b) =>
                    Number(a.price) - Number(b.price)
                );
                break;

            case "price-high":
                filtered.sort((a, b) =>
                    Number(b.price) - Number(a.price)
                );
                break;

            default:
                filtered.sort((a, b) =>
                    Number(Boolean(b.featured)) -
                    Number(Boolean(a.featured))
                );
        }

        return filtered;
    }

    function createProductCard(product) {
        const card = document.createElement("article");
        card.className = "shop-product-card";

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "shop-product-image";

        const imageLink = document.createElement("a");
        imageLink.href =
            `product.html?slug=${encodeURIComponent(product.slug || "")}`;
        imageLink.setAttribute("aria-label", `View ${product.name}`);

        const image = document.createElement("img");
        image.src = product.image || product.images?.[0] || "";
        image.alt = product.name || "SELFII UNIVERSE product";
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("error", () => {
            image.removeAttribute("src");
            image.alt = "Product image unavailable";
            imageWrapper.classList.add("image-unavailable");
        }, { once: true });

        if (!image.src || image.src === window.location.href) {
            image.removeAttribute("src");
            imageWrapper.classList.add("image-unavailable");
        }

        imageLink.appendChild(image);
        imageWrapper.appendChild(imageLink);

        if (product.featured) {
            const badge = document.createElement("span");
            badge.className = "shop-product-badge";
            badge.textContent = "Featured";
            imageWrapper.appendChild(badge);
        }

        const info = document.createElement("div");
        info.className = "shop-product-info";

        const category = document.createElement("p");
        category.className = "shop-product-category";
        category.textContent = getCategoryName(product.category);

        const title = document.createElement("h3");
        const titleLink = document.createElement("a");
        titleLink.href = imageLink.href;
        titleLink.textContent = product.name;
        title.appendChild(titleLink);

        const description = document.createElement("p");
        description.className = "shop-product-description";
        description.textContent = product.description || "";

        const price = document.createElement("p");
        price.className = "shop-product-price";
        price.textContent = formatPrice(product.price);

        const button = document.createElement("button");
        button.className = "shop-add-to-cart";
        button.type = "button";
        button.textContent = "Add to Cart";

        const outOfStock = Number(product.stock) <= 0;

        if (outOfStock) {
            button.disabled = true;
            button.textContent = "Out of Stock";
        }

        button.addEventListener("click", () => {
            if (!window.SelfiiCart) {
                alert("Your shopping cart could not be loaded. Please refresh.");
                return;
            }

            const added = window.SelfiiCart.addItem({
                id: getProductId(product),
                name: product.name,
                price: product.price,
                image: product.image || product.images?.[0] || "",
                category: getCategoryName(product.category),
                description: product.description || ""
            });

            if (added) {
                button.textContent = "Added to Cart ✓";

                window.setTimeout(() => {
                    if (button.isConnected && !button.disabled) {
                        button.textContent = "Add to Cart";
                    }
                }, 1500);
            } else {
                alert("Unable to add this product to your cart.");
            }
        });

        info.append(category, title, description, price, button);
        card.append(imageWrapper, info);

        return card;
    }

    function renderProducts() {
        const filtered = getFilteredProducts();

        productGrid.replaceChildren();

        filtered.forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });

        if (productCount) {
            productCount.textContent = String(filtered.length);
        }

        if (emptyState) {
            emptyState.hidden = filtered.length > 0;

            const heading = emptyState.querySelector("h3");
            const message = emptyState.querySelector("p");

            if (heading) heading.textContent = "No products found";

            if (message) {
                message.textContent = products.length
                    ? "Try changing your search or category."
                    : "Products will appear here when they become available.";
            }
        }

        productGrid.hidden = filtered.length === 0;

        if (window.SelfiiCart) {
            window.SelfiiCart.updateCartCount();
        }
    }

    async function loadProducts() {
        productGrid.hidden = true;

        if (emptyState) {
            emptyState.hidden = false;

            const heading = emptyState.querySelector("h3");
            const message = emptyState.querySelector("p");

            if (heading) heading.textContent = "Loading products...";
            if (message) message.textContent = "Please wait while we load the latest products.";
        }

        try {
            const response = await fetch(
                `${API_BASE}/products?limit=50`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success !== true) {
                throw new Error(
                    data.message || "Unable to load products."
                );
            }

            products = Array.isArray(data.products)
                ? data.products
                : [];

            renderProducts();
        } catch (error) {
            console.error("Shop products error:", error);

            products = [];
            productGrid.replaceChildren();
            productGrid.hidden = true;

            if (emptyState) {
                emptyState.hidden = false;

                const heading = emptyState.querySelector("h3");
                const message = emptyState.querySelector("p");

                if (heading) heading.textContent = "Unable to load products";

                if (message) {
                    message.textContent =
                        "Please check your connection and try again.";
                }
            }
        }
    }

    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            categoryButtons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");
            activeCategory = button.dataset.category || "all";

            renderProducts();
        });
    });

    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", event => {
            event.preventDefault();
            searchTerm = searchInput.value.trim();
            renderProducts();
        });

        searchInput.addEventListener("input", () => {
            searchTerm = searchInput.value.trim();
            renderProducts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            sortMode = sortSelect.value;
            renderProducts();
        });
    }

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            activeCategory = "all";
            searchTerm = "";
            sortMode = "featured";

            if (searchInput) searchInput.value = "";
            if (sortSelect) sortSelect.value = "featured";

            categoryButtons.forEach(button => {
                button.classList.toggle(
                    "active",
                    (button.dataset.category || "all") === "all"
                );
            });

            renderProducts();
        });
    }

    loadProducts();
});
