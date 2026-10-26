
(() => {
    "use strict";

    const API_BASE = window.SELFII_API_URL ||
        (["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "http://localhost:5000/api"
            : "https://selfii-universe-api.onrender.com/api");

    const $ = (selector) => document.querySelector(selector);

    const state = {
        user: null,
        products: [],
        currentSection: "overview",
        noticeTimer: null,
        loadingProducts: false,
        selectedProductImage: null,
        currentProductImageUrl: "",
        productImagePreviewUrl: ""
    };

    const elements = {
        loading: $("#adminLoading"),
        app: $("#adminApp"),
        sidebar: $("#adminSidebar"),
        overlay: $("#sidebarOverlay"),
        menuToggle: $("#adminMenuToggle"),
        notice: $("#adminNotice"),
        productModal: $("#productModal"),
        productForm: $("#productForm"),
        productFormError: $("#productFormError"),
        saveProductButton: $("#saveProductButton"),
        productImageFile: $("#productImageFile"),
        chooseProductImageButton: $("#chooseProductImageButton"),
        removeProductImageButton: $("#removeProductImageButton"),
        productImagePreview: $("#productImagePreview"),
        productImagePreviewContainer: $("#productImagePreviewContainer"),
        productImageUploadStatus: $("#productImageUploadStatus"),
        productGrid: $("#productsTable"),
        recentOrders: $("#recentOrders")
    };

    async function api(path, options = {}) {
        const config = {
            ...options,
            credentials: "include",
            headers: {
                ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        };

        let response;

        try {
            response = await fetch(`${API_BASE}${path}`, config);
        } catch (error) {
            throw new Error(
                "Unable to reach the server. Check your internet connection and backend deployment."
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (response.status === 401) {
            throw Object.assign(
                new Error(data.message || "Your session has expired. Please log in again."),
                { status: 401 }
            );
        }

        if (response.status === 403) {
            throw Object.assign(
                new Error(data.message || "Administrator access is required."),
                { status: 403 }
            );
        }

        if (!response.ok || data.success === false) {
            throw Object.assign(
                new Error(data.message || `Request failed (${response.status}).`),
                { status: response.status, data }
            );
        }

        return data;
    }

    function showNotice(message, type = "success") {
        if (!elements.notice) return;

        clearTimeout(state.noticeTimer);

        elements.notice.textContent = message;
        elements.notice.className = `admin-notice ${type}`;
        elements.notice.hidden = false;

        state.noticeTimer = setTimeout(() => {
            elements.notice.hidden = true;
        }, 6000);
    }

    function showLoadingMessage(message) {
        if (elements.loading) {
            const paragraph = elements.loading.querySelector("p");

            if (paragraph) paragraph.textContent = message;
        }
    }

    function showAccessError(message, showLogin = true) {
        if (elements.loading) {
            elements.loading.replaceChildren();

            const mark = document.createElement("div");
            mark.className = "loading-mark";
            mark.textContent = "S";

            const title = document.createElement("h2");
            title.textContent = "Admin access unavailable";

            const description = document.createElement("p");
            description.textContent = message;

            elements.loading.append(mark, title, description);

            if (showLogin) {
                const link = document.createElement("a");
                link.href = "../pages/login.html";
                link.className = "primary-button";
                link.textContent = "Go to login";
                elements.loading.append(link);
            }

            const home = document.createElement("a");
            home.href = "../index.html";
            home.className = "secondary-button";
            home.textContent = "Return to storefront";
            elements.loading.append(home);

            elements.loading.style.padding = "30px";
        }
    }

    async function initialize() {
        try {
            showLoadingMessage("Verifying administrator access...");

            const data = await api("/auth/me");

            if (!data.user || data.user.role !== "admin") {
                showAccessError(
                    "This account does not have administrator permissions.",
                    false
                );
                return;
            }

            state.user = data.user;

            $("#adminName").textContent =
                data.user.fullName || "Administrator";

            $("#adminAvatar").textContent =
                (data.user.fullName || "S").trim().charAt(0).toUpperCase();

            $("#welcomeName").textContent =
                data.user.fullName
                    ? `, ${data.user.fullName.trim().split(/\s+/)[0]}`
                    : "";

            $("#adminFooterYear").textContent = new Date().getFullYear();

            elements.loading.hidden = true;
            elements.app.hidden = false;

            bindEvents();

            await loadProducts();
            updateOverview();

            showNotice("Administrator access verified.", "success");

        } catch (error) {
            if (error.status === 401) {
                showAccessError(
                    "Please log in with your administrator account before opening this dashboard."
                );
            } else if (error.status === 403) {
                showAccessError(
                    "Your account cannot access this dashboard.",
                    false
                );
            } else {
                showAccessError(error.message);
            }
        }
    }

    function bindEvents() {
        document.querySelectorAll("[data-section]").forEach((button) => {
            button.addEventListener("click", () => {
                openSection(button.dataset.section);
            });
        });

        document.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.action;

                if (action === "add-product") {
                    openProductModal();
                } else if (action === "manage-products") {
                    openSection("products");
                } else if (action === "view-orders") {
                    openSection("orders");
                }
            });
        });

        $("#refreshOverview").addEventListener("click", refreshDashboard);
        $("#refreshOrders").addEventListener("click", () => {
            showNotice(
                "The orders API has not been connected yet.",
                "error"
            );
        });

        $("#refreshCustomers").addEventListener("click", () => {
            showNotice(
                "The administrator customers API has not been connected yet.",
                "error"
            );
        });

        $("#addProductButton").addEventListener("click", openProductModal);
        $("#closeProductModal").addEventListener("click", closeProductModal);
        $("#cancelProductForm").addEventListener("click", closeProductModal);
        elements.productForm.addEventListener("submit", saveProduct);

        elements.chooseProductImageButton.addEventListener("click", () => {
            elements.productImageFile.click();
        });

        elements.productImageFile.addEventListener("change", handleProductImageSelection);

        elements.removeProductImageButton.addEventListener("click", () => {
            clearSelectedProductImage(true);
        });

        elements.productModal.addEventListener("click", (event) => {
            if (event.target === elements.productModal) {
                closeProductModal();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeProductModal();
                closeSidebar();
            }
        });

        elements.menuToggle.addEventListener("click", toggleSidebar);
        elements.overlay.addEventListener("click", closeSidebar);

        $("#adminLogout").addEventListener("click", logout);

        $("#productSearch").addEventListener("input", renderProducts);
        $("#productCategoryFilter").addEventListener("change", renderProducts);
        $("#productStatusFilter").addEventListener("change", renderProducts);

        $("#orderSearch").addEventListener("input", () => {
            showNotice(
                "Order search will be enabled when the orders API is connected.",
                "error"
            );
        });

        $("#customerSearch").addEventListener("input", () => {
            showNotice(
                "Customer search will be enabled when the customers API is connected.",
                "error"
            );
        });

        document.querySelectorAll("[data-category]").forEach((button) => {
            button.addEventListener("click", () => {
                $("#productCategoryFilter").value = button.dataset.category;
                openSection("products");
                renderProducts();
            });
        });

        elements.productGrid.addEventListener("click", handleProductAction);
    }

    function openSection(name) {
        const section = document.getElementById(`section-${name}`);

        if (!section) return;

        state.currentSection = name;

        document.querySelectorAll(".admin-section").forEach((item) => {
            item.classList.toggle("active", item === section);
        });

        document.querySelectorAll(".admin-nav-link").forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.section === name
            );
        });

        const titles = {
            overview: "Overview",
            products: "Products",
            collections: "Collections",
            orders: "Orders",
            customers: "Customers"
        };

        $("#pageTitle").textContent = titles[name] || "Admin Dashboard";

        closeSidebar();

        if (name === "products") {
            loadProducts();
        }
    }

    function toggleSidebar() {
        const isOpen = elements.sidebar.classList.toggle("open");

        elements.overlay.classList.toggle("active", isOpen);
        elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
    }

    function closeSidebar() {
        elements.sidebar.classList.remove("open");
        elements.overlay.classList.remove("active");
        elements.menuToggle.setAttribute("aria-expanded", "false");
    }

    async function loadProducts() {
        if (state.loadingProducts) return;

        state.loadingProducts = true;

        elements.productGrid.replaceChildren();

        const loading = document.createElement("div");
        loading.className = "empty-inline";
        loading.textContent = "Loading products...";
        elements.productGrid.append(loading);

        try {
            const data = await api("/products?limit=100");

            state.products = Array.isArray(data.products)
                ? data.products
                : [];

            renderProducts();
            updateOverview();

        } catch (error) {
            elements.productGrid.replaceChildren();

            const message = document.createElement("div");
            message.className = "empty-inline";
            message.textContent = error.message;
            elements.productGrid.append(message);

            if (error.status === 401 || error.status === 403) {
                showNotice(error.message, "error");
            }

        } finally {
            state.loadingProducts = false;
        }
    }

    function formatMoney(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) return "—";

        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2
        }).format(amount);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function createBadge(text, type) {
        return createElement("span", `status-badge ${type}`, text);
    }

    function renderProducts() {
        const search = $("#productSearch").value.trim().toLowerCase();
        const category = $("#productCategoryFilter").value;
        const stockFilter = $("#productStatusFilter").value;

        const filtered = state.products.filter((product) => {
            const matchesSearch = [
                product.name,
                product.description,
                product.category,
                product.slug
            ].some((value) =>
                String(value || "").toLowerCase().includes(search)
            );

            const matchesCategory =
                !category || product.category === category;

            const stock = Number(product.stock || 0);

            const matchesStock =
                !stockFilter ||
                (stockFilter === "in-stock" && stock > 0) ||
                (stockFilter === "out-of-stock" && stock <= 0);

            return matchesSearch && matchesCategory && matchesStock;
        });

        elements.productGrid.replaceChildren();

        if (!filtered.length) {
            const empty = createElement(
                "div",
                "empty-inline",
                state.products.length
                    ? "No products match your filters."
                    : "Your catalog is empty. Add your first product to get started."
            );

            elements.productGrid.append(empty);
            return;
        }

        const table = createElement("table", "admin-table");
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        [
            "PRODUCT",
            "CATEGORY",
            "PRICE",
            "STOCK",
            "STATUS",
            "ACTIONS"
        ].forEach((label) => {
            headerRow.append(createElement("th", "", label));
        });

        thead.append(headerRow);

        const tbody = document.createElement("tbody");

        filtered.forEach((product) => {
            const row = document.createElement("tr");

            const productCell = document.createElement("td");
            const productInfo = createElement("div", "table-product");

            const image = createElement("img", "table-product-image");
            image.src = product.image;
            image.alt = product.name || "Product image";
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";

            image.addEventListener("error", () => {
                image.style.display = "none";
            }, { once: true });

            const text = document.createElement("div");
            text.append(
                createElement("strong", "", product.name || "Unnamed product"),
                createElement("small", "", product.slug || "")
            );

            productInfo.append(image, text);
            productCell.append(productInfo);

            const categoryCell = createElement(
                "td",
                "",
                formatCategory(product.category)
            );

            const priceCell = createElement(
                "td",
                "",
                formatMoney(product.price)
            );

            const stock = Number(product.stock || 0);
            const stockCell = createElement("td", "", String(stock));

            const statusCell = document.createElement("td");

            statusCell.append(
                createBadge(
                    stock > 0 ? "In stock" : "Out of stock",
                    stock > 0 ? "success" : "danger"
                )
            );

            const actionsCell = document.createElement("td");
            const actions = createElement("div", "table-actions");

            const editButton = createElement("button", "table-action-button");
            editButton.type = "button";
            editButton.dataset.action = "edit";
            editButton.dataset.id = product._id || product.id || "";
            editButton.setAttribute("aria-label", `Edit ${product.name}`);
            editButton.title = "Edit product";

            const editIcon = createElement("i", "fa-solid fa-pen");
            editButton.append(editIcon);

            const deleteButton = createElement(
                "button",
                "table-action-button delete"
            );

            deleteButton.type = "button";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = product._id || product.id || "";
            deleteButton.setAttribute("aria-label", `Delete ${product.name}`);
            deleteButton.title = "Delete product";

            deleteButton.append(
                createElement("i", "fa-solid fa-trash")
            );

            actions.append(editButton, deleteButton);
            actionsCell.append(actions);

            row.append(
                productCell,
                categoryCell,
                priceCell,
                stockCell,
                statusCell,
                actionsCell
            );

            tbody.append(row);
        });

        table.append(thead, tbody);
        elements.productGrid.append(table);

        $("#navProductCount").textContent = String(state.products.length);
    }

    function formatCategory(category) {
        const names = {
            boutique: "Boutique",
            selfiitees: "SelfiiTees",
            printing: "Printing"
        };

        return names[category] || category || "Uncategorized";
    }

    function updateOverview() {
        $("#statProducts").textContent = String(state.products.length);

        $("#navProductCount").textContent = String(state.products.length);

        // Orders, customers, and revenue remain unknown until their real
        // administrator endpoints are implemented.
        $("#statOrders").textContent = "—";
        $("#statCustomers").textContent = "—";
        $("#statRevenue").textContent = "—";

        elements.recentOrders.replaceChildren();

        const message = createElement(
            "div",
            "empty-inline",
            "Recent orders will appear here after the administrator orders API is connected."
        );

        elements.recentOrders.append(message);
    }


    function clearSelectedProductImage(clearExisting = false) {
        if (state.productImagePreviewUrl) {
            URL.revokeObjectURL(state.productImagePreviewUrl);
            state.productImagePreviewUrl = "";
        }

        state.selectedProductImage = null;
        elements.productImageFile.value = "";

        if (clearExisting) {
            state.currentProductImageUrl = "";
        }

        const previewUrl = state.selectedProductImage
            ? state.productImagePreviewUrl
            : state.currentProductImageUrl;

        if (previewUrl) {
            elements.productImagePreview.src = previewUrl;
            elements.productImagePreviewContainer.hidden = false;
        } else {
            elements.productImagePreview.removeAttribute("src");
            elements.productImagePreviewContainer.hidden = true;
        }

        elements.productImageUploadStatus.textContent = previewUrl
            ? "Image ready. Choose another image to replace it."
            : "JPG, PNG, or WebP. Maximum file size: 5 MB.";
    }

    function handleProductImageSelection(event) {
        const input = event.currentTarget;
        const selectedFile = input.files && input.files[0];

        if (!selectedFile) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(selectedFile.type)) {
            input.value = "";
            showFormError("Choose a JPG, PNG, or WebP image.");
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            input.value = "";
            showFormError("The image must not exceed 5 MB.");
            return;
        }

        if (state.productImagePreviewUrl) {
            URL.revokeObjectURL(state.productImagePreviewUrl);
        }

        state.selectedProductImage = selectedFile;
        state.productImagePreviewUrl = URL.createObjectURL(selectedFile);

        elements.productImagePreview.src = state.productImagePreviewUrl;
        elements.productImagePreviewContainer.hidden = false;
        elements.productImageUploadStatus.textContent =
            selectedFile.name + " selected. It will upload when you save the product.";

        elements.productFormError.hidden = true;
    }

    async function uploadProductImage(file) {
        const formData = new FormData();
        formData.append("image", file);

        const data = await api("/products/upload-image", {
            method: "POST",
            body: formData
        });

        if (!data.image || !/^https:\/\//i.test(data.image)) {
            throw new Error("The server did not return a valid secure image URL.");
        }

        return data.image;
    }

    function openProductModal(product = null) {
        elements.productForm.reset();
        elements.productFormError.hidden = true;
        $("#productId").value = "";

        clearSelectedProductImage(true);
        state.currentProductImageUrl = product ? (product.image || "") : "";

        if (state.currentProductImageUrl) {
            elements.productImagePreview.src = state.currentProductImageUrl;
            elements.productImagePreviewContainer.hidden = false;
            elements.productImageUploadStatus.textContent =
                "Current image. Choose another image if you want to replace it.";
        }

        $("#productModalTitle").textContent = product
            ? "Edit product"
            : "Add a product";

        $("#saveProductButton").querySelector("span").textContent =
            product ? "Update product" : "Save product";

        if (product) {
            $("#productId").value = product._id || product.id || "";
            $("#productName").value = product.name || "";
            $("#productDescription").value = product.description || "";
            $("#productPrice").value = product.price ?? "";
            $("#productStock").value = product.stock ?? 0;
            $("#productCategory").value = product.category || "boutique";

            $("#productFeatured").checked = Boolean(product.featured);
        }

        elements.productModal.hidden = false;
        document.body.classList.add("modal-open");

        $("#productName").focus();
    }

    function closeProductModal() {
        if (elements.productModal.hidden) return;

        elements.productModal.hidden = true;
        document.body.classList.remove("modal-open");
        elements.productFormError.hidden = true;

        if (state.productImagePreviewUrl) {
            URL.revokeObjectURL(state.productImagePreviewUrl);
            state.productImagePreviewUrl = "";
        }
    }

    function showFormError(message) {
        elements.productFormError.textContent = message;
        elements.productFormError.hidden = false;
    }


    async function saveProduct(event) {
        event.preventDefault();

        elements.productFormError.hidden = true;

        const name = $("#productName").value.trim();
        const description = $("#productDescription").value.trim();
        const price = Number($("#productPrice").value);
        const stock = Number($("#productStock").value);
        const category = $("#productCategory").value;
        const featured = $("#productFeatured").checked;
        const id = $("#productId").value;

        if (!name || !description) {
            showFormError("Complete all required fields.");
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            showFormError("Enter a valid, non-negative price.");
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            showFormError("Stock must be a whole number of zero or more.");
            return;
        }

        if (!id && !state.selectedProductImage) {
            showFormError("Please choose a product image.");
            return;
        }

        const button = elements.saveProductButton;
        const originalText = button.querySelector("span").textContent;

        button.disabled = true;
        elements.chooseProductImageButton.disabled = true;
        elements.removeProductImageButton.disabled = true;

        try {
            let image = state.currentProductImageUrl;

            if (state.selectedProductImage) {
                button.querySelector("span").textContent = "Uploading image...";
                elements.productImageUploadStatus.textContent =
                    "Uploading image securely to Cloudinary...";

                image = await uploadProductImage(state.selectedProductImage);
                state.currentProductImageUrl = image;

                elements.productImagePreview.src = image;
                elements.productImagePreviewContainer.hidden = false;
                elements.productImageUploadStatus.textContent =
                    "Image uploaded. Saving product...";
            }

            if (!image) {
                showFormError("Please choose a product image.");
                return;
            }

            const payload = {
                name,
                description,
                price,
                stock,
                category,
                image,
                featured
            };

            button.querySelector("span").textContent = "Saving product...";

            if (id) {
                await api(`/products/${encodeURIComponent(id)}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });

                showNotice("Product updated successfully.");
            } else {
                await api("/products", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showNotice("Product created successfully.");
            }

            closeProductModal();
            await loadProducts();

        } catch (error) {
            showFormError(error.message);

        } finally {
            button.disabled = false;
            elements.chooseProductImageButton.disabled = false;
            elements.removeProductImageButton.disabled = false;
            button.querySelector("span").textContent = originalText;
        }
    }

    async function handleProductAction(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const { action, id } = button.dataset;

        const product = state.products.find(
            (item) => String(item._id || item.id) === String(id)
        );

        if (!product) {
            showNotice("The selected product could not be found.", "error");
            return;
        }

        if (action === "edit") {
            openProductModal(product);
            return;
        }

        if (action === "delete") {
            const confirmed = window.confirm(
                `Remove "${product.name}" from the active storefront?`
            );

            if (!confirmed) return;

            button.disabled = true;

            try {
                await api(`/products/${encodeURIComponent(id)}`, {
                    method: "DELETE"
                });

                showNotice("Product removed from the active catalog.");
                await loadProducts();

            } catch (error) {
                showNotice(error.message, "error");
                button.disabled = false;
            }
        }
    }

    async function refreshDashboard() {
        const button = $("#refreshOverview");
        button.disabled = true;

        try {
            await loadProducts();
            showNotice("Dashboard product data refreshed.");
        } finally {
            button.disabled = false;
        }
    }

    async function logout() {
        const button = $("#adminLogout");
        button.disabled = true;

        try {
            await api("/auth/logout", { method: "POST" });
        } catch (error) {
            if (error.status !== 401) {
                showNotice(
                    `${error.message} Redirecting to login.`,
                    "error"
                );
            }
        }

        window.location.href = "../pages/login.html";
    }

    initialize();
})();
