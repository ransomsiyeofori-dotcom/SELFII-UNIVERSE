"use strict";


// ==========================================
// SELFII UNIVERSE - AUTHENTICATION
// ==========================================

const API_BASE_URL = "http://localhost:5000/api";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

function showAuthMessage(message, type = "error") {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.className = `auth-message is-visible ${type === "success" ? "is-success" : "is-error"}`;
    authMessage.hidden = false;
    authMessage.setAttribute("role", "alert");
}

function clearAuthMessage() {
    if (!authMessage) return;

    authMessage.textContent = "";
    authMessage.hidden = true;
}

async function authRequest(endpoint, data = null, method = "POST") {
    const options = {
        method,
        credentials: "include",
        headers: {
            "Accept": "application/json"
        }
    };

    if (data !== null) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}/auth${endpoint}`, options);

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Something went wrong. Please try again."
        );
    }

    return result;
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        button.dataset.originalText = button.textContent.trim();
        button.disabled = true;
        button.textContent = loadingText;
        button.setAttribute("aria-busy", "true");
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "Submit";
        button.removeAttribute("aria-busy");
        delete button.dataset.originalText;
    }
}

// PASSWORD VISIBILITY TOGGLES

document.querySelectorAll("[data-password-toggle]").forEach(button => {
    button.addEventListener("click", () => {
        const inputId = button.dataset.passwordToggle;
        const input = document.getElementById(inputId);

        if (!input) return;

        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";

        button.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );

        button.setAttribute("aria-pressed", String(showPassword));

        const icon = button.querySelector("i");

        if (icon) {
            icon.classList.toggle("fa-eye", !showPassword);
            icon.classList.toggle("fa-eye-slash", showPassword);
        }
    });
});

// LOGIN

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearAuthMessage();

        const email = loginForm.elements.email.value.trim();
        const password = loginForm.elements.password.value;
        const button = document.getElementById("loginButton");

        if (!email || !password) {
            showAuthMessage("Please enter your email and password.");
            return;
        }

        setButtonLoading(button, true, "Signing in...");

        try {
            await authRequest("/login", { email, password });

            showAuthMessage("Login successful. Redirecting...", "success");

            window.location.href = "../index.html";
        } catch (error) {
            showAuthMessage(error.message);
        } finally {
            setButtonLoading(button, false);
        }
    });
}

// REGISTRATION

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearAuthMessage();

        const fullName = registerForm.elements.fullName.value.trim();
        const email = registerForm.elements.email.value.trim();
        const password = registerForm.elements.password.value;
        const confirmPassword =
            registerForm.elements.confirmPassword.value;

        const errors = {
            fullName: document.getElementById("fullNameError"),
            email: document.getElementById("emailError"),
            password: document.getElementById("passwordError"),
            confirmPassword:
                document.getElementById("confirmPasswordError")
        };

        Object.values(errors).forEach(element => {
            if (element) element.textContent = "";
        });

        let valid = true;

        if (fullName.length < 2 || fullName.length > 100) {
            if (errors.fullName) {
                errors.fullName.textContent =
                    "Enter a name between 2 and 100 characters.";
            }
            valid = false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            if (errors.email) {
                errors.email.textContent = "Enter a valid email address.";
            }
            valid = false;
        }

        if (password.length < 8 || password.length > 72) {
            if (errors.password) {
                errors.password.textContent =
                    "Password must be between 8 and 72 characters.";
            }
            valid = false;
        }

        if (password !== confirmPassword) {
            if (errors.confirmPassword) {
                errors.confirmPassword.textContent =
                    "Your passwords do not match.";
            }
            valid = false;
        }

        if (!valid) {
            showAuthMessage("Please correct the highlighted fields.");
            return;
        }

        const button = document.getElementById("registerButton");
        setButtonLoading(button, true, "Creating account...");

        try {
            await authRequest("/register", {
                fullName,
                email,
                password
            });

            showAuthMessage(
                "Your account has been created! Redirecting to login...",
                "success"
            );

            registerForm.reset();

            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);
        } catch (error) {
            showAuthMessage(error.message);
        } finally {
            setButtonLoading(button, false);
        }
    });
}

// CURRENT YEAR

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}
