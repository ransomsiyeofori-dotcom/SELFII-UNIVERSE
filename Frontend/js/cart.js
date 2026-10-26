"use strict";

/* =========================================
   SELFII UNIVERSE — SHARED SHOPPING CART
========================================= */

(function () {
    const STORAGE_KEY = "selfiiCart";

    function getCart() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error("Could not load cart:", error);
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));

            document.dispatchEvent(
                new CustomEvent("selfiiCartUpdated")
            );

            updateCartCount();
            return true;
        } catch (error) {
            console.error("Could not save cart:", error);
            return false;
        }
    }

    function formatPrice(price) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(price) || 0);
    }

    function addItem(product) {
        if (
            !product ||
            product.id == null ||
            !product.name ||
            !Number.isFinite(Number(product.price)) ||
            Number(product.price) < 0
        ) {
            return false;
        }

        const cart = getCart();
        const existing = cart.find(
            item => String(item.id) === String(product.id)
        );

        if (existing) {
            existing.quantity = (Number(existing.quantity) || 1) + 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image: product.image || "",
                category: product.categoryName || product.category || "SELFII UNIVERSE",
                description: product.description || "",
                quantity: 1
            });
        }

        return saveCart(cart);
    }

    function updateQuantity(id, quantity) {
        const cart = getCart();
        const item = cart.find(
            product => String(product.id) === String(id)
        );

        if (!item) return false;

        const newQuantity = Math.floor(Number(quantity));

        if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
            return removeItem(id);
        }

        item.quantity = newQuantity;
        return saveCart(cart);
    }

    function removeItem(id) {
        const cart = getCart().filter(
            item => String(item.id) !== String(id)
        );

        return saveCart(cart);
    }

    function getSubtotal() {
        return getCart().reduce((total, item) => {
            return total +
                (Number(item.price) || 0) *
                Math.max(0, Number(item.quantity) || 0);
        }, 0);
    }

    function updateCartCount() {
        const count = getCart().reduce((total, item) => {
            return total + Math.max(0, Number(item.quantity) || 0);
        }, 0);

        document.querySelectorAll("#cartCount").forEach(element => {
            element.textContent = String(count);
        });

        return count;
    }

    window.SelfiiCart = {
        getCart,
        addItem,
        updateQuantity,
        removeItem,
        getSubtotal,
        formatPrice,
        updateCartCount
    };

    document.addEventListener("DOMContentLoaded", updateCartCount);
    window.addEventListener("storage", updateCartCount);
})();
