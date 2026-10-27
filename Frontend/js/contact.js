/* =========================================
   SELFII UNIVERSE — CONTACT PAGE
   ========================================= */

(() => {
    "use strict";

    const contactForm = document.getElementById("contactForm");
    const messageInput = document.getElementById("contactMessage");
    const messageCount = document.getElementById("messageCount");
    const feedback = document.getElementById("contactFeedback");
    const submitButton = document.getElementById("contactSubmit");
    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    if (!contactForm) return;

    const originalButtonContent = submitButton
        ? submitButton.innerHTML
        : "";

    function showFeedback(message, type) {
        if (!feedback) return;

        feedback.textContent = message;
        feedback.className =
            `contact-form-feedback is-visible is-${type}`;
    }

    function clearFeedback() {
        if (!feedback) return;

        feedback.textContent = "";
        feedback.className = "contact-form-feedback";
    }

    function updateCharacterCount() {
        if (!messageInput || !messageCount) return;

        messageCount.textContent =
            `${messageInput.value.length} / ${messageInput.maxLength}`;
    }

    if (messageInput) {
        messageInput.addEventListener("input", () => {
            updateCharacterCount();
            clearFeedback();
        });

        updateCharacterCount();
    }

    contactForm.addEventListener("input", clearFeedback);
    contactForm.addEventListener("change", clearFeedback);

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearFeedback();

        if (!contactForm.reportValidity()) return;

        const name = document.getElementById("contactName")?.value.trim();
        const email = document.getElementById("contactEmail")?.value.trim();
        const subject = document.getElementById("contactSubject")?.value;
        const orderNumber = document.getElementById("contactOrder")?.value.trim();
        const message = messageInput?.value.trim();
        const consent = document.getElementById("contactConsent")?.checked;

        if (!name || !email || !subject || !message) {
            showFeedback("Please complete all required fields.", "error");
            return;
        }

        if (message.length < 10) {
            showFeedback(
                "Please provide a little more detail in your message.",
                "error"
            );
            return;
        }

        if (!consent) {
            showFeedback(
                "Please agree to the contact terms before continuing.",
                "error"
            );
            return;
        }

        /*
         * The backend endpoint will be connected after we inspect
         * the existing API routes. Do not silently pretend a message
         * was delivered when no delivery endpoint is configured.
         */

        showFeedback(
            "The form is ready, but message delivery has not been connected yet. Please email selfiitees@gmail.com for now.",
            "error"
        );
    });

    window.addEventListener("pageshow", () => {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonContent;
        }
    });
})();
