"use strict";

/* =========================================
   SELFII UNIVERSE — CHECKOUT
========================================= */

(() => {
    const API_BASE = (
        window.SELFII_API_URL || "/api"
    ).replace(/\/+$/, "");

    const elements = {
        form: document.getElementById("checkoutForm"),
        notice: document.getElementById("checkoutNotice"),
        name: document.getElementById("customerName"),
        email: document.getElementById("customerEmail"),
        phone: document.getElementById("customerPhone"),
        addressLine: document.getElementById("addressLine"),
        city: document.getElementById("city"),
        state: document.getElementById("state"),
        country: document.getElementById("country"),
        confirmAddress: document.getElementById("confirmAddress"),
        items: document.getElementById("checkoutItems"),
        empty: document.getElementById("checkoutEmpty"),
        subtotal: document.getElementById("checkoutSubtotal"),
        delivery: document.getElementById("checkoutDelivery"),
        total: document.getElementById("checkoutTotal"),
        button: document.getElementById("placeOrderButton"),
        buttonText: document.getElementById("placeOrderText"),
        layout: document.querySelector(".checkout-layout"),
        intro: document.querySelector(".checkout-intro"),
        createdPanel: document.getElementById("orderCreatedPanel"),
        createdNumber: document.getElementById("createdOrderNumber"),
        createdMessage: document.getElementById("createdOrderMessage"),
        currentYear: document.getElementById("currentYear")
    };

    let currentUser = null;
    let submitting = false;

    function formatPrice(value) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function showNotice(message, type = "error") {
        if (!elements.notice) return;

        elements.notice.textContent = message;
        elements.notice.classList.toggle(
            "is-success",
            type === "success"
        );
        elements.notice.hidden = false;
        elements.notice.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    function clearNotice() {
        if (!elements.notice) return;

        elements.notice.textContent = "";
        elements.notice.hidden = true;
        elements.notice.classList.remove("is-success");
    }

    async function apiRequest(path, options = {}) {
        const config = {
            method: options.method || "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        };

        if (options.body !== undefined) {
            config.headers["Content-Type"] = "application/json";
            config.body = JSON.stringify(options.body);
        }

        let response;

        try {
            response = await fetch(`${API_BASE}${path}`, config);
        } catch (error) {
            throw new Error(
                "We couldn't connect to SELFII's server. Check your internet connection and try again."
            );
        }

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error(
                "The server returned an unreadable response. Please try again."
            );
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message ||
                `The request failed with status ${response.status}.`
            );
        }

        return result;
    }

    function getCart() {
        if (!window.SelfiiCart) {
            throw new Error(
                "Your shopping cart could not be loaded. Return to your cart and try again."
            );
        }

        const cart = window.SelfiiCart.getCart();

        if (!Array.isArray(cart) || cart.length === 0) {
            throw new Error(
                "Your cart is empty. Add a product before checking out."
            );
        }

        return cart;
    }

    function renderCart() {
        if (!elements.items || !window.SelfiiCart) return;

        const cart = window.SelfiiCart.getCart();
        const isEmpty = cart.length === 0;
        const subtotal = window.SelfiiCart.getSubtotal();

        elements.items.replaceChildren();
        elements.empty.hidden = !isEmpty;

        if (elements.form) {
            elements.form.hidden = isEmpty;
        }

        if (elements.subtotal) {
            elements.subtotal.textContent = formatPrice(subtotal);
        }

        if (elements.total) {
            elements.total.textContent = formatPrice(subtotal);
        }

        if (elements.delivery) {
            elements.delivery.textContent = "Confirmed later";
        }

        if (elements.button) {
            elements.button.disabled = isEmpty || submitting;
        }

        cart.forEach(item => {
            const quantity = Math.max(
                1,
                Math.floor(Number(item.quantity) || 1)
            );
            const price = Math.max(0, Number(item.price) || 0);

            const row = document.createElement("article");
            row.className = "checkout-item";

            const image = document.createElement("img");
            image.className = "checkout-item-image";
            image.alt = item.name || "Product";
            image.loading = "lazy";

            if (item.image) {
                image.src = item.image;
            } else {
                image.hidden = true;
            }

            image.addEventListener("error", () => {
                image.hidden = true;
            });

            const details = document.createElement("div");
            details.className = "checkout-item-details";

            const name = document.createElement("h3");
            name.textContent = item.name || "Product";

            const quantityText = document.createElement("p");
            quantityText.textContent = `Quantity: ${quantity}`;

            const priceText = document.createElement("p");
            priceText.textContent = `${formatPrice(price)} each`;

            details.append(name, quantityText, priceText);

            const lineTotal = document.createElement("strong");
            lineTotal.className = "checkout-item-price";
            lineTotal.textContent = formatPrice(price * quantity);

            row.append(image, details, lineTotal);
            elements.items.appendChild(row);
        });
    }

    async function loadCustomer() {
        try {
            const result = await apiRequest("/auth/me");

            if (!result.user) {
                throw new Error("Your account details could not be loaded.");
            }

            if (result.user.role !== "customer") {
                throw new Error(
                    "Please sign in with a customer account to place an order."
                );
            }

            currentUser = result.user;

            elements.name.value = currentUser.fullName || "";
            elements.email.value = currentUser.email || "";
            elements.phone.value = currentUser.phone || "";

            if (elements.name.value) {
                elements.name.readOnly = true;
            }

            if (elements.phone.value) {
                elements.phone.dataset.accountPhone = elements.phone.value;
            }

            return true;
        } catch (error) {
            console.error("Checkout account error:", error);

            showNotice(
                error.message.includes("log in") ||
                error.message.includes("session") ||
                error.message.includes("sign in")
                    ? `${error.message} Please open the login page and sign in before checking out.`
                    : error.message
            );

            if (elements.button) {
                elements.button.disabled = true;
            }

            return false;
        }
    }

    function setSubmitting(value) {
        submitting = value;

        if (elements.button) {
            elements.button.disabled = value;
        }

        if (elements.buttonText) {
            elements.buttonText.textContent = value
                ? "Creating order..."
                : "Create order";
        }
    }

    async function submitOrder(event) {
        event.preventDefault();

        if (submitting) return;

        clearNotice();

        if (!currentUser) {
            showNotice(
                "Please sign in to your customer account before placing an order."
            );
            return;
        }

        if (!elements.form.reportValidity()) return;

        if (!elements.confirmAddress.checked) {
            showNotice(
                "Please confirm that your contact and delivery details are correct."
            );
            elements.confirmAddress.focus();
            return;
        }

        let cart;

        try {
            cart = getCart();
        } catch (error) {
            showNotice(error.message);
            return;
        }

        const items = cart.map(item => ({
            id: item.id,
            quantity: Number(item.quantity)
        }));

        if (items.some(item =>
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )) {
            showNotice(
                "Your cart contains an invalid quantity. Return to your cart and correct it."
            );
            return;
        }

        const shippingAddress = {
            recipientName: elements.name.value.trim(),
            phone: elements.phone.value.trim(),
            addressLine: elements.addressLine.value.trim(),
            city: elements.city.value.trim(),
            state: elements.state.value.trim(),
            country: elements.country.value.trim()
        };

        if (Object.values(shippingAddress).some(value => !value)) {
            showNotice("Please complete all required delivery details.");
            return;
        }

        setSubmitting(true);

        try {
            const result = await apiRequest("/orders", {
                method: "POST",
                body: {
                    items,
                    shippingAddress
                }
            });

            if (!result.order || !result.order.orderNumber) {
                throw new Error(
                    "The server did not return an order number. Please check your orders before trying again."
                );
            }

            elements.createdNumber.textContent =
                result.order.orderNumber;

            elements.createdMessage.textContent =
                "Your order has been created, but payment has not been made or verified. Kora payment setup is still pending. Please do not transfer money based on this page.";

            if (elements.layout) {
                elements.layout.hidden = true;
            }

            if (elements.intro) {
                elements.intro.hidden = true;
            }

            elements.createdPanel.hidden = false;
            elements.createdPanel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        } catch (error) {
            console.error("Order creation error:", error);
            showNotice(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        if (elements.currentYear) {
            elements.currentYear.textContent =
                new Date().getFullYear();
        }

        renderCart();

        if (!elements.form) return;

        if (window.SelfiiCart) {
            document.addEventListener(
                "selfiiCartUpdated",
                renderCart
            );
        }

        elements.form.addEventListener("submit", submitOrder);

        await loadCustomer();
    });
})();
