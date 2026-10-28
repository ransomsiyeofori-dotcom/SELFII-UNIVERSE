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

// ==========================================
// SELFII UNIVERSE - HOMEPAGE ACCOUNT
// ==========================================

(async function initializeHomepageAccount() {
    const API = "/api";

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

    // Display the saved photo immediately.
    try {
        displayPhoto(localStorage.getItem("selfiiProfilePhotoUrl") || "");
    } catch (error) {
        console.warn("Could not read the saved profile photo:", error);
    }

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
            return;
        }

        const result = await response.json();

        if (!result.success || !result.user) {
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

        try {
            if (user.profilePhotoUrl) {
                localStorage.setItem("selfiiProfilePhotoUrl", user.profilePhotoUrl);
            } else {
                localStorage.removeItem("selfiiProfilePhotoUrl");
            }
        } catch (error) {
            console.warn("Could not save the profile photo URL:", error);
        }

    } catch (error) {
        console.error("Could not load homepage account:", error);
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
