/* ========================================
   SELFII UNIVERSE — SHOP FUNCTIONALITY
======================================== */

document.addEventListener("DOMContentLoaded", () => {

    const productGrid = document.getElementById("shopProductGrid");
    const categoryButtons = document.querySelectorAll(".category-btn");
    const searchForm = document.getElementById("shopSearchForm");
    const searchInput = document.getElementById("shopSearch");
    const sortSelect = document.getElementById("sortProducts");
    const productCount = document.getElementById("productCount");
    const emptyState = document.getElementById("shopEmptyState");
    const resetButton = document.getElementById("resetShopFilters");

    if (!productGrid) return;

    /*
     * DEMONSTRATION PRODUCTS
     *
     * These are sample products to help us build and test
     * the storefront. Replace them with your actual products,
     * images, and prices before accepting customer orders.
     */

    const products = [
        {
            id: 1,
            name: "Classic African Print",
            category: "boutique",
            categoryName: "SELFII Boutique",
            price: 18500,
            description: "A stylish piece inspired by African fashion.",
            image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80",
            badge: "Featured"
        },
        {
            id: 2,
            name: "Elegant Everyday Outfit",
            category: "boutique",
            categoryName: "SELFII Boutique",
            price: 22000,
            description: "Effortless style for everyday occasions.",
            image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80",
            badge: "Popular"
        },
        {
            id: 3,
            name: "Signature Graphic Tee",
            category: "selfiitees",
            categoryName: "Selfiitees",
            price: 9500,
            description: "Express your personality through your style.",
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format&fit=crop&q=80",
            badge: "Bestseller"
        },
        {
            id: 4,
            name: "Personalized Photo Tee",
            category: "selfiitees",
            categoryName: "Selfiitees",
            price: 12000,
            description: "Turn your favorite memories into wearable art.",
            image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&auto=format&fit=crop&q=80",
            badge: "Personalize"
        },
        {
            id: 5,
            name: "Custom Printed Mug",
            category: "printing",
            categoryName: "Print Selfii",
            price: 6500,
            description: "Create a memorable gift with your own design.",
            image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&auto=format&fit=crop&q=80",
            badge: "Gift Idea"
        },
        {
            id: 6,
            name: "Custom Tote Bag",
            category: "printing",
            categoryName: "Print Selfii",
            price: 8000,
            description: "Make your everyday essentials uniquely yours.",
            image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&auto=format&fit=crop&q=80",
            badge: "Creative"
        },
        {
            id: 7,
            name: "Premium Minimal Tee",
            category: "selfiitees",
            categoryName: "Selfiitees",
            price: 11000,
            description: "A clean, versatile look with a premium feel.",
            image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80",
            badge: ""
        },
        {
            id: 8,
            name: "Personalized Gift Set",
            category: "printing",
            categoryName: "Print Selfii",
            price: 15000,
            description: "A thoughtful custom gift for someone special.",
            image: "https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=600&auto=format&fit=crop&q=80",
            badge: "Special"
        }
    ];

    let activeCategory = "all";
    let searchTerm = "";
    let sortMode = "featured";

    // Format prices in Nigerian Naira.
    function formatPrice(price) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(price);
    }

    // Render product cards.
    function renderProducts() {

        let filteredProducts = products.filter(product => {

            const matchesCategory =
                activeCategory === "all" ||
                product.category === activeCategory;

            const searchableText = (
                product.name + " " +
                product.categoryName + " " +
                product.description
            ).toLowerCase();

            const matchesSearch = searchableText.includes(
                searchTerm.toLowerCase()
            );

            return matchesCategory && matchesSearch;
        });

        // Sort products.
        if (sortMode === "name") {
            filteredProducts.sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        if (sortMode === "price-low") {
            filteredProducts.sort((a, b) => a.price - b.price);
        }

        if (sortMode === "price-high") {
            filteredProducts.sort((a, b) => b.price - a.price);
        }

        productGrid.innerHTML = "";

        filteredProducts.forEach(product => {

            const card = document.createElement("article");
            card.className = "shop-product-card";

            const image = document.createElement("div");
            image.className = "shop-product-image";

            const img = document.createElement("img");
            img.src = product.image;
            img.alt = product.name;
            img.loading = "lazy";

            // Display a fallback if the image fails to load.
            img.addEventListener("error", () => {
                img.style.display = "none";
                image.style.background = "#EDE7DA";
            });

            image.appendChild(img);

            if (product.badge) {
                const badge = document.createElement("span");
                badge.className = "shop-product-badge";
                badge.textContent = product.badge;
                image.appendChild(badge);
            }

            const info = document.createElement("div");
            info.className = "shop-product-info";

            const category = document.createElement("p");
            category.className = "shop-product-category";
            category.textContent = product.categoryName;

            const title = document.createElement("h3");
            title.textContent = product.name;

            const description = document.createElement("p");
            description.className = "shop-product-description";
            description.textContent = product.description;

            const price = document.createElement("p");
            price.className = "shop-product-price";
            price.textContent = formatPrice(product.price);

            const button = document.createElement("button");
            button.className = "shop-add-to-cart";
            button.type = "button";
            button.textContent = "Add to Cart";

            button.addEventListener("click", () => {
                if (window.SelfiiCart && window.SelfiiCart.addItem(product)) {
                    const originalText = button.textContent;
                    button.textContent = "Added to Cart ✓";
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                } else {
                    alert("Unable to add this product to your cart.");
                }
            });

            info.append(
                category,
                title,
                description,
                price,
                button
            );

            card.append(image, info);
            productGrid.appendChild(card);
        });

        productCount.textContent = filteredProducts.length;

        emptyState.hidden = filteredProducts.length !== 0;
        productGrid.hidden = filteredProducts.length === 0;
    }

    // Category buttons.
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

    // Search products.
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        searchTerm = searchInput.value.trim();
        renderProducts();
    });

    // Update results while typing.
    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim();
        renderProducts();
    });

    // Sort products.
    sortSelect.addEventListener("change", () => {
        sortMode = sortSelect.value;
        renderProducts();
    });

    // Reset filters.
    resetButton.addEventListener("click", () => {

        activeCategory = "all";
        searchTerm = "";
        sortMode = "featured";

        searchInput.value = "";
        sortSelect.value = "featured";

        categoryButtons.forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.category === "all"
            );
        });

        renderProducts();
    });

    // Initial display.
    renderProducts();
    if (window.SelfiiCart) window.SelfiiCart.updateCartCount();

});
