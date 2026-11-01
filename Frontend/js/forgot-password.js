"use strict";

const API_BASE_URL = window.SELFII_API_URL || "/api";

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("email");
const authMessage = document.getElementById("authMessage");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");

function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message is-visible is-${type}`;
}

forgotPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        showMessage("Please enter your email address.", "error");
        emailInput.focus();
        return;
    }

    if (!emailInput.checkValidity()) {
        showMessage("Please enter a valid email address.", "error");
        emailInput.focus();
        return;
    }

    forgotPasswordButton.disabled = true;
    forgotPasswordButton.innerHTML =
        'Sending... <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';

    authMessage.textContent = "";
    authMessage.className = "auth-message";

    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to process your request. Please try again."
            );
        }

        showMessage(
            data.message ||
            "If an account exists for that email, a password reset link has been sent.",
            "success"
        );

        forgotPasswordForm.reset();

    } catch (error) {
        showMessage(
            error.message || "A connection error occurred. Please try again.",
            "error"
        );
    } finally {
        forgotPasswordButton.disabled = false;
        forgotPasswordButton.innerHTML =
            'Send Reset Link <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
    }
});

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}
