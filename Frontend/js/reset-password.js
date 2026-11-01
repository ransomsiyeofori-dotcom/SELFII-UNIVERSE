"use strict";

const API_BASE_URL = window.SELFII_API_URL || "/api";

const resetPasswordForm = document.getElementById("resetPasswordForm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const authMessage = document.getElementById("authMessage");
const resetPasswordButton = document.getElementById("resetPasswordButton");

const resetToken = new URLSearchParams(window.location.search).get("token");

function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message is-visible is-${type}`;
}

function setFormDisabled(disabled) {
    passwordInput.disabled = disabled;
    confirmPasswordInput.disabled = disabled;
    resetPasswordButton.disabled = disabled;
}

if (!resetToken || !/^[a-f0-9]{64}$/i.test(resetToken)) {
    showMessage(
        "This password reset link is invalid. Please request a new one.",
        "error"
    );
    setFormDisabled(true);
}

resetPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!resetToken || !/^[a-f0-9]{64}$/i.test(resetToken)) {
        showMessage(
            "This password reset link is invalid. Please request a new one.",
            "error"
        );
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 8) {
        showMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );
        passwordInput.focus();
        return;
    }

    if (new TextEncoder().encode(password).length > 72) {
        showMessage(
            "Your password is too long. Please use a shorter password.",
            "error"
        );
        passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match.", "error");
        confirmPasswordInput.focus();
        return;
    }

    resetPasswordButton.disabled = true;
    resetPasswordButton.innerHTML =
        'Updating... <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';

    authMessage.textContent = "";
    authMessage.className = "auth-message";

    try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                token: resetToken,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to reset your password. Please try again."
            );
        }

        showMessage(
            data.message || "Your password has been updated successfully.",
            "success"
        );

        resetPasswordForm.reset();
        setFormDisabled(true);

        const signInLink = document.createElement("a");
        signInLink.href = "login.html";
        signInLink.className = "auth-link";
        signInLink.textContent = "Sign in to your account";

        const linkContainer = document.createElement("p");
        linkContainer.className = "auth-switch";
        linkContainer.appendChild(signInLink);

        resetPasswordForm.insertAdjacentElement("afterend", linkContainer);

    } catch (error) {
        showMessage(
            error.message || "A connection error occurred. Please try again.",
            "error"
        );

        resetPasswordButton.disabled = false;
        resetPasswordButton.innerHTML =
            'Update Password <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
    }
});

document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
        const input = document.getElementById(
            toggle.dataset.passwordToggle
        );

        if (!input) return;

        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";
        toggle.textContent = isPassword ? "Hide" : "Show";
        toggle.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
});

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}
