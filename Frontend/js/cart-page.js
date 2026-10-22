/* =========================================
   SELFII UNIVERSE — CART PAGE
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const cartItemsElement = document.getElementById("cartItems");
    const cartEmptyElement = document.getElementById("cartEmpty");
    const cartSummaryElement = document.getElementById("cartSummary");
    const cartItemCountElement = document.getElementById("cartItemCount");
    const summaryItemCountElement = document.getElementById("summaryItemCount");
    const subtotalElement = document.getElementById("cartSubtotal");
    const totalElement = document.getElementById("cartTotal");
    const checkoutButton = document.getElementById("checkoutButton");
    const currentYearElement = document.getElementById("currentYear");

    if (!cartItemsElement || !window.SelfiiCart) {
        console.error("Cart page could not initialize.");
        return;
    }

    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }

    function renderCart() {
        const cart = window.SelfiiCart.getCart();

        const totalQuantity = cart.reduce((total, item) => {
            return total + Math.max(0, Number(item.quantity) || 0);
        }, 0);

        const subtotal = window.SelfiiCart.getSubtotal();
        const isEmpty = cart.length === 0;

        cartItemsElement.innerHTML = "";
        cartEmptyElement.hidden = !isEmpty;
        cartItemsElement.hidden = isEmpty;
        cartSummaryElement.hidden = isEmpty;
        checkoutButton.classList.toggle("disabled", isEmpty);
        checkoutButton.setAttribute("aria-disabled", String(isEmpty));

        cartItemCountElement.textContent = `(${totalQuantity})`;
        summaryItemCountElement.textContent = String(totalQuantity);
        subtotalElement.textContent = window.SelfiiCart.formatPrice(subtotal);
        totalElement.textContent = window.SelfiiCart.formatPrice(subtotal);

        cart.forEach(item => {
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const price = Math.max(0, Number(item.price) || 0);

            const card = document.createElement("article");
            card.className = "cart-item";

            const image = document.createElement("img");
            image.className = "cart-item-image";
            image.src = item.image || "";
            image.alt = item.name || "Cart product";
            image.loading = "lazy";

            image.addEventListener("error", () => {
                image.removeAttribute("src");
                image.style.background = "#EDE7DA";
            });

            const details = document.createElement("div");
            details.className = "cart-item-details";

            const category = document.createElement("p");
            category.className = "cart-item-category";
            category.textContent = item.category || "SELFII UNIVERSE";

            const name = document.createElement("h3");
            name.className = "cart-item-name";
            name.textContent = item.name || "Product";

            const unitPrice = document.createElement("p");
            unitPrice.className = "cart-item-price";
            unitPrice.textContent =
                `${window.SelfiiCart.formatPrice(price)} each`;

            const actions = document.createElement("div");
            actions.className = "cart-item-actions";

            const quantityControl = document.createElement("div");
            quantityControl.className = "quantity-control";
            quantityControl.setAttribute("aria-label", "Product quantity");

            const decreaseButton = document.createElement("button");
            decreaseButton.type = "button";
            decreaseButton.textContent = "−";
            decreaseButton.setAttribute(
                "aria-label",
                `Decrease quantity of ${item.name}`
            );

            decreaseButton.addEventListener("click", () => {
                window.SelfiiCart.updateQuantity(
                    item.id,
                    quantity - 1
                );
            });

            const quantityValue = document.createElement("span");
            quantityValue.className = "quantity-value";
            quantityValue.textContent = String(quantity);

            const increaseButton = document.createElement("button");
            increaseButton.type = "button";
            increaseButton.textContent = "+";
            increaseButton.setAttribute(
                "aria-label",
                `Increase quantity of ${item.name}`
            );

            increaseButton.addEventListener("click", () => {
                window.SelfiiCart.updateQuantity(
                    item.id,
                    quantity + 1
                );
            });

            quantityControl.append(
                decreaseButton,
                quantityValue,
                increaseButton
            );

            const removeButton = document.createElement("button");
            removeButton.className = "remove-item";
            removeButton.type = "button";
            removeButton.textContent = "Remove";
            removeButton.setAttribute(
                "aria-label",
                `Remove ${item.name} from cart`
            );

            removeButton.addEventListener("click", () => {
                window.SelfiiCart.removeItem(item.id);
            });

            actions.append(quantityControl, removeButton);

            const itemTotal = document.createElement("p");
            itemTotal.className = "cart-item-total";
            itemTotal.textContent = window.SelfiiCart.formatPrice(
                price * quantity
            );

            details.append(category, name, unitPrice, actions, itemTotal);
            card.append(image, details);
            cartItemsElement.appendChild(card);
        });
    }

    checkoutButton.addEventListener("click", event => {
        if (window.SelfiiCart.getCart().length === 0) {
            event.preventDefault();
        }
    });

    document.addEventListener("selfiiCartUpdated", renderCart);

    renderCart();
});
