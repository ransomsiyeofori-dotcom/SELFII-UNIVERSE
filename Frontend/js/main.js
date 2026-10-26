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
        searchToggle.setAttribute("aria-expanded", String(isOpen));

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
// ==========================================

// ==========================================
// SELFII UNIVERSE - HOMEPAGE ACCOUNT
// ==========================================

(async function initializeHomepageAccount() {
    const API = "https://selfii-universe-api.onrender.com/api";

    const menu = document.getElementById("accountMenu");
    const link = document.getElementById("accountLink");
    const dropdown = document.getElementById("accountDropdown");
    const name = document.getElementById("accountDropdownName");
    const email = document.getElementById("accountDropdownEmail");
    const photo = document.getElementById("accountDropdownPhoto");
    const placeholder = document.getElementById("accountDropdownPlaceholder");
    const signOut = document.getElementById("accountSignOut");

    if (!menu || !link || !dropdown) return;

    let loggedIn = false;

    function displayPhoto(url) {
        link.replaceChildren();

        if (url) {
            const image = document.createElement("img");
            image.className = "account-profile-photo";
            image.src = url;
            image.alt = "My profile photo";

            image.onerror = () => {
                image.remove();
                link.innerHTML = '<i class="fa-regular fa-user"></i>';
            };

            link.appendChild(image);
        } else {
            link.innerHTML = '<i class="fa-regular fa-user"></i>';
        }

        if (photo && placeholder) {
            if (url) {
                photo.src = url;
                photo.hidden = false;
                placeholder.hidden = true;

                photo.onerror = () => {
                    photo.hidden = true;
                    placeholder.hidden = false;
                };
            } else {
                photo.removeAttribute("src");
                photo.hidden = true;
                placeholder.hidden = false;
            }
        }
    }

    function closeDropdown() {
        dropdown.hidden = true;
        link.setAttribute("aria-expanded", "false");
    }

    // Initialize the account interaction immediately.
    link.addEventListener("click", event => {
        event.preventDefault();

        if (!loggedIn) {
            window.location.href = "pages/login.html";
            return;
        }

        dropdown.hidden = !dropdown.hidden;
        link.setAttribute(
            "aria-expanded",
            String(!dropdown.hidden)
        );
    });

    document.addEventListener("click", event => {
        if (!menu.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });

    // Retrieve the actual logged-in customer.
    try {
        const response = await fetch(`${API}/auth/me`, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            displayPhoto("");
            return;
        }

        const result = await response.json();

        if (!result.success || !result.user) {
            displayPhoto("");
            return;
        }

        const user = result.user;
        loggedIn = true;

        link.href = "#";
        link.setAttribute("aria-label", "Open account menu");
        link.setAttribute("title", "My Account");

        if (name) {
            name.textContent = user.fullName || "My Account";
        }

        if (email) {
            email.textContent = user.email || "";
        }

        displayPhoto(user.profilePhotoUrl || "");

    } catch (error) {
        console.error("Could not load homepage account:", error);
        displayPhoto("");
    }

    // Sign out.
    if (signOut) {
        signOut.addEventListener("click", async () => {
            signOut.disabled = true;

            try {
                const response = await fetch(`${API}/auth/logout`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok || result.success === false) {
                    throw new Error(
                        result.message || "Sign out failed."
                    );
                }

                window.location.replace("index.html");

            } catch (error) {
                console.error("Sign out failed:", error);

                alert(
                    error.message ||
                    "Unable to sign out. Please try again."
                );

                signOut.disabled = false;
            }
        });
    }
})();
