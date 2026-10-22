"use strict";

// ==========================================
// SELFII UNIVERSE
// Main JavaScript
// ==========================================


// MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");
const mobileNav = document.getElementById("mobileNav");

if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = mobileNav.classList.toggle("active");

        menuToggle.setAttribute("aria-expanded", String(isOpen));

        menuToggle.innerHTML = isOpen
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
    });

    mobileNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileNav.classList.remove("active");

            menuToggle.setAttribute("aria-expanded", "false");

            menuToggle.innerHTML =
                '<i class="fa-solid fa-bars"></i>';
        });
    });
}


// SEARCH PANEL

const searchToggle = document.getElementById("searchToggle");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchToggle && searchForm) {
    searchToggle.addEventListener("click", () => {
        const isOpen = searchForm.classList.toggle("active");

        if (isOpen && searchInput) {
            searchInput.focus();
        }
    });
}


// TEMPORARY PRODUCTS
// These sample products are for layout testing only.
// Real products will come from the backend later.

const products = [
    {
        id: 1,
        name: "Signature T-Shirt",
        description: "Personalised everyday wear",
        price: 18000,
        category: "Clothing"
    },
    {
        id: 2,
        name: "Framed Portrait",
        description: "A memory worth displaying",
        price: 25000,
        category: "Artwork"
    },
    {
        id: 3,
        name: "Custom Tote Bag",
        description: "Your art, your everyday essential",
        price: 12000,
        category: "Accessories"
    },
    {
        id: 4,
        name: "Personalised Mug",
        description: "A little something made for you",
        price: 8500,
        category: "Gifts"
    }
];


// FORMAT PRICES

function formatPrice(price) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(price);
}


// RENDER PRODUCTS

const productGrid = document.getElementById("productGrid");

function renderProducts(items) {
    if (!productGrid) return;

    if (items.length === 0) {
        productGrid.innerHTML = `
            <p class="empty-products">
                No matching products found.
            </p>
        `;

        return;
    }

    productGrid.innerHTML = items.map(product => `
        <article class="product-card">

            <div class="product-image">

                <div class="product-placeholder">
                    ${product.category.toUpperCase()}
                </div>

            </div>

            <div class="product-info">

                <h3>${product.name}</h3>

                <p class="product-description">
                    ${product.description}
                </p>

                <p class="product-price">
                    ${formatPrice(product.price)}
                </p>

                <button
                    class="product-add"
                    type="button"
                    data-product-id="${product.id}">

                    Add to Cart

                </button>

            </div>

        </article>
    `).join("");
}

renderProducts(products);


// TEMPORARY SHOPPING CART

let cart = [];

function updateCartCount() {
    const cartCount = document.getElementById("cartCount");

    if (!cartCount) return;

    const totalItems = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    cartCount.textContent = totalItems;
}


// EVENT DELEGATION FOR PRODUCT BUTTONS

if (productGrid) {
    productGrid.addEventListener("click", event => {
        const button = event.target.closest(".product-add");

        if (!button) return;

        const productId = Number(button.dataset.productId);

        const product = products.find(item => {
            return item.id === productId;
        });

        if (!product) return;

        const existingItem = cart.find(item => {
            return item.id === productId;
        });

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }

        updateCartCount();

        const originalText = button.textContent;

        button.textContent = "Added to Cart";

        window.setTimeout(() => {
            button.textContent = originalText;
        }, 1000);
    });
}


// PRODUCT SEARCH

if (searchForm && searchInput) {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        const query = searchInput.value
            .trim()
            .toLowerCase();

        const filteredProducts = products.filter(product => {
            return (
                product.name.toLowerCase().includes(query) ||
                product.description.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
            );
        });

        renderProducts(filteredProducts);

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