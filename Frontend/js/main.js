"use strict";

// ==========================================
// SELFII UNIVERSE
// Main JavaScript
// ==========================================


// SHARED STOREFRONT HEADER CONTROLS
// Mobile navigation and search-toggle behaviour are handled by header.js.
// Keep these references for the homepage product-search handler.
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");


// LIVE HOMEPAGE PRODUCTS

const API_BASE = window.SELFII_API_URL ||
    (["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://localhost:5000/api"
        : "/api");

let products = [];

function formatPrice(price) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(Number(price) || 0);
}

const productGrid = document.getElementById("productGrid");

function renderProducts(items) {
    if (!productGrid) return;

    productGrid.replaceChildren();

    if (!items.length) {
        const message = document.createElement("p");
        message.className = "empty-products";
        message.textContent = "Products will appear here soon.";
        productGrid.appendChild(message);
        return;
    }

    items.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "product-image";

        const imageLink = document.createElement("a");
        imageLink.href =
            "pages/product.html?slug=" +
            encodeURIComponent(product.slug || "");

        const image = document.createElement("img");
        image.src = product.image || product.images?.[0] || "";
        image.alt = product.name || "SELFII UNIVERSE product";
        image.loading = "lazy";
        image.decoding = "async";

        image.addEventListener("error", () => {
            image.removeAttribute("src");
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
            badge.className = "product-badge";
            badge.textContent = "Featured";
            imageWrapper.appendChild(badge);
        }

        const info = document.createElement("div");
        info.className = "product-info";

        const title = document.createElement("h3");
        const titleLink = document.createElement("a");
        titleLink.href = imageLink.href;
        titleLink.textContent = product.name;
        title.appendChild(titleLink);

        const description = document.createElement("p");
        description.className = "product-description";
        description.textContent = product.description || "";

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatPrice(product.price);

        const button = document.createElement("button");
        button.className = "product-add";
        button.type = "button";
        button.dataset.productId = product._id || product.id || product.slug;

        const outOfStock = Number(product.stock) <= 0;
        button.disabled = outOfStock;
        button.textContent = outOfStock ? "Out of Stock" : "Add to Cart";

        info.append(title, description, price, button);
        card.append(imageWrapper, info);
        productGrid.appendChild(card);
    });
}

async function loadHomepageProducts() {
    if (!productGrid) return;

    productGrid.setAttribute("aria-busy", "true");

    try {
        let response = await fetch(
            API_BASE + "/products?featured=true&limit=8",
            { headers: { Accept: "application/json" } }
        );

        let data = await response.json();

        if (!response.ok || data.success !== true) {
            throw new Error(data.message || "Unable to load products.");
        }

        products = Array.isArray(data.products) ? data.products : [];

        if (products.length === 0) {
            response = await fetch(
                API_BASE + "/products?limit=8",
                { headers: { Accept: "application/json" } }
            );

            data = await response.json();

            if (!response.ok || data.success !== true) {
                throw new Error(data.message || "Unable to load products.");
            }

            products = Array.isArray(data.products) ? data.products : [];
        }

        renderProducts(products);
    } catch (error) {
        console.error("Homepage products error:", error);

        const message = document.createElement("p");
        message.className = "empty-products";
        message.textContent =
            "We couldn't load products right now. Please try again later.";

        productGrid.replaceChildren(message);
    } finally {
        productGrid.removeAttribute("aria-busy");
    }
}

loadHomepageProducts();

// Use the shared shopping cart.
function updateCartCount() {
    if (window.SelfiiCart) {
        window.SelfiiCart.updateCartCount();
    }
}

if (productGrid) {
    productGrid.addEventListener("click", event => {
        const button = event.target.closest(".product-add");
        if (!button || button.disabled) return;

        const productId = String(button.dataset.productId);
        const product = products.find(item =>
            String(item._id || item.id || item.slug) === productId
        );

        if (!product || !window.SelfiiCart) {
            alert("Your shopping cart could not be loaded. Please refresh the page.");
            return;
        }

        const added = window.SelfiiCart.addItem({
            id: product._id || product.id || product.slug,
            name: product.name,
            price: product.price,
            image: product.image || product.images?.[0] || "",
            category: product.category,
            description: product.description || ""
        });

        if (added) {
            button.textContent = "Added to Cart ✓";

            window.setTimeout(() => {
                if (button.isConnected && !button.disabled) {
                    button.textContent = "Add to Cart";
                }
            }, 1500);

            updateCartCount();
        } else {
            alert("Unable to add this product to your cart.");
        }
    });
}

// Homepage product search.
if (searchForm && searchInput && document.getElementById("shop")) {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        const query = searchInput.value.trim().toLowerCase();

        const filtered = products.filter(product =>
            [
                product.name,
                product.description,
                product.category
            ].join(" ").toLowerCase().includes(query)
        );

        renderProducts(filtered);

        document.getElementById("shop")?.scrollIntoView({
            behavior: "smooth"
        });
    });
}

// NEWSLETTER FORM DEMONSTRATION

const newsletterForm = document.getElementById("newsletterForm");

if (newsletterForm) {
    newsletterForm.addEventListener("submit", event => {
        event.preventDefault();

        alert(
            "Newsletter registration will be available when the backend is connected."
        );
    });
}


// CURRENT YEAR

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


// INITIAL CART COUNT

updateCartCount();
// ==========================================
