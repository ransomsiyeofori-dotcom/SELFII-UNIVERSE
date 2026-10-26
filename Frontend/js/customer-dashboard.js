"use strict";

const API_BASE_URL = "https://selfii-universe-api.onrender.com/api";
const LOGIN_URL = "../pages/login.html";

const elements = {
    welcomeName: document.getElementById("welcomeName"),
    summaryName: document.getElementById("summaryName"),
    summaryEmail: document.getElementById("summaryEmail"),

    profileForm: document.getElementById("profileForm"),
    profileFullName: document.getElementById("profileFullName"),
    profileEmail: document.getElementById("profileEmail"),
    profilePhone: document.getElementById("profilePhone"),
    profileRole: document.getElementById("profileRole"),
    saveProfileButton: document.getElementById("saveProfileButton"),

    addressList: document.getElementById("addressList"),
    addressForm: document.getElementById("addressForm"),
    addressFormTitle: document.getElementById("addressFormTitle"),
    addressId: document.getElementById("addressId"),
    addressLabel: document.getElementById("addressLabel"),
    addressRecipient: document.getElementById("addressRecipient"),
    addressPhone: document.getElementById("addressPhone"),
    addressLine: document.getElementById("addressLine"),
    addressCity: document.getElementById("addressCity"),
    addressState: document.getElementById("addressState"),
    addressCountry: document.getElementById("addressCountry"),
    addressDefault: document.getElementById("addressDefault"),
    showAddressForm: document.getElementById("showAddressForm"),

    pageTitle: document.getElementById("pageTitle"),
    notice: document.getElementById("dashboardNotice"),
    currentYear: document.getElementById("currentYear"),
    sidebar: document.getElementById("sidebar"),
    overlay: document.getElementById("sidebarOverlay"),
    menuToggle: document.getElementById("menuToggle")
};

const sectionTitles = {
    overview: "Overview",
    orders: "My Orders",
    designs: "My Designs",
    profile: "My Profile",
    addresses: "My Addresses",
    settings: "Settings"
};

let currentUser = null;
let addresses = [];
let addressFormBusy = false;

function showNotice(message, type = "info") {
    if (!elements.notice) return;

    elements.notice.textContent = message;
    elements.notice.className = `dashboard-notice ${type}`;
    elements.notice.hidden = false;
}

function hideNotice() {
    if (elements.notice) {
        elements.notice.hidden = true;
        elements.notice.textContent = "";
    }
}

async function apiRequest(path, options = {}) {
    const headers = {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include"
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        if (path !== "/auth/logout") {
            window.location.replace(LOGIN_URL);
        }

        throw new Error(result.message || "Your session has expired. Please log in again.");
    }

    if (!response.ok || result.success === false) {
        throw new Error(result.message || "The request could not be completed.");
    }

    return result;
}

function closeSidebar() {
    elements.sidebar?.classList.remove("open");
    elements.overlay?.classList.remove("active");
    elements.menuToggle?.setAttribute("aria-expanded", "false");
}

function openSidebar() {
    elements.sidebar?.classList.add("open");
    elements.overlay?.classList.add("active");
    elements.menuToggle?.setAttribute("aria-expanded", "true");
}

function navigateToSection(sectionName) {
    const target = document.getElementById(`section-${sectionName}`);

    if (!target || !sectionTitles[sectionName]) return;

    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.hidden = true;
        section.classList.remove("active");
    });

    target.hidden = false;
    target.classList.add("active");

    document.querySelectorAll("[data-section]").forEach(button => {
        const active = button.dataset.section === sectionName;

        button.classList.toggle("active", active);

        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    if (elements.pageTitle) {
        elements.pageTitle.textContent = sectionTitles[sectionName];
    }

    closeSidebar();

    if (sectionName === "addresses") {
        loadAddresses();
    }
}

function displayUser(user) {
    currentUser = user;

    const fullName = user.fullName || "Customer";
    const email = user.email || "";
    const role = user.role || "customer";

    if (elements.welcomeName) {
        elements.welcomeName.textContent = fullName;
    }

    if (elements.summaryName) {
        elements.summaryName.textContent = fullName;
    }

    if (elements.summaryEmail) {
        elements.summaryEmail.textContent = email;
    }

    if (elements.profileFullName) {
        elements.profileFullName.value = fullName;
    }

    if (elements.profileEmail) {
        elements.profileEmail.value = email;
    }

    if (elements.profilePhone) {
        elements.profilePhone.value = user.phone || "";
    }

    if (elements.profileRole) {
        elements.profileRole.value = role;
    }
}

async function loadCustomer() {
    try {
        const result = await apiRequest("/auth/me");

        if (!result.success || !result.user) {
            throw new Error(result.message || "Unable to load your account.");
        }

        if (result.user.role !== "customer") {
            showNotice(
                "This dashboard is for customer accounts. Your account has a different role.",
                "error"
            );
            return;
        }

        displayUser(result.user);
        await loadAddresses(true);
    } catch (error) {
        console.error("Customer dashboard error:", error);

        if (error.message && !error.message.includes("session")) {
            showNotice(
                error.message || "We couldn't load your account. Please refresh and try again.",
                "error"
            );
        }
    }
}

async function saveProfile(event) {
    event.preventDefault();
    hideNotice();

    const fullName = elements.profileFullName?.value.trim() || "";
    const phone = elements.profilePhone?.value.trim() || "";

    if (fullName.length < 2) {
        showNotice("Please enter your full name.", "error");
        elements.profileFullName?.focus();
        return;
    }

    if (fullName.length > 100 || phone.length > 25) {
        showNotice("Please check the length of your name or phone number.", "error");
        return;
    }

    const button = elements.saveProfileButton;

    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {
        const result = await apiRequest("/auth/profile", {
            method: "PATCH",
            body: JSON.stringify({ fullName, phone })
        });

        if (result.user) {
            displayUser(result.user);
        }

        showNotice("Your profile has been updated successfully.", "success");
    } catch (error) {
        console.error("Profile update error:", error);
        showNotice(error.message || "Unable to update your profile.", "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    }
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function renderAddresses() {
    if (!elements.addressList) return;

    elements.addressList.replaceChildren();

    if (!addresses.length) {
        const empty = createElement(
            "div",
            "address-empty-state",
            "You haven't saved a delivery address yet."
        );

        const hint = createElement(
            "p",
            "",
            "Add an address to make future checkouts easier."
        );

        empty.appendChild(hint);
        elements.addressList.appendChild(empty);
        return;
    }

    const container = createElement("div", "address-cards");

    addresses.forEach(address => {
        const card = createElement("article", "address-card");
        const heading = createElement("div", "address-card-heading");

        const title = createElement(
            "h3",
            "address-card-title",
            address.label || "Delivery address"
        );

        heading.appendChild(title);

        if (address.isDefault) {
            heading.appendChild(
                createElement("span", "address-default-badge", "Default address")
            );
        }

        card.appendChild(heading);

        const details = createElement("div", "address-card-details");

        [
            address.recipientName,
            address.phone,
            address.addressLine,
            [address.city, address.state].filter(Boolean).join(", "),
            address.country
        ].filter(Boolean).forEach(value => {
            details.appendChild(createElement("p", "", value));
        });

        card.appendChild(details);

        const actions = createElement("div", "address-card-actions");

        const editButton = createElement("button", "address-action-button", "Edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => openAddressForm(address));

        const deleteButton = createElement(
            "button",
            "address-action-button address-delete-button",
            "Delete"
        );
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteAddress(address._id));

        actions.appendChild(editButton);

        if (!address.isDefault) {
            const defaultButton = createElement(
                "button",
                "address-action-button",
                "Set as default"
            );
            defaultButton.type = "button";
            defaultButton.addEventListener("click", () => setDefaultAddress(address));
            actions.appendChild(defaultButton);
        }

        actions.appendChild(deleteButton);
        card.appendChild(actions);
        container.appendChild(card);
    });

    elements.addressList.appendChild(container);
}

async function loadAddresses(silent = false) {
    if (!elements.addressList) return;

    try {
        const result = await apiRequest("/auth/addresses");
        addresses = Array.isArray(result.addresses) ? result.addresses : [];
        renderAddresses();
    } catch (error) {
        console.error("Address loading error:", error);

        if (!silent) {
            showNotice(error.message || "Unable to load your delivery addresses.", "error");
        }
    }
}

function resetAddressForm() {
    elements.addressForm?.reset();

    if (elements.addressId) elements.addressId.value = "";
    if (elements.addressLabel) elements.addressLabel.value = "Home";
    if (elements.addressCountry) elements.addressCountry.value = "Nigeria";
    if (elements.addressDefault) elements.addressDefault.checked = false;

    if (elements.addressFormTitle) {
        elements.addressFormTitle.textContent = "Add delivery address";
    }

    const saveButton = elements.addressForm?.querySelector('[type="submit"]');

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Address";
    }
}

function openAddressForm(address = null) {
    if (!elements.addressForm) return;

    hideNotice();
    resetAddressForm();

    if (address) {
        elements.addressId.value = address._id || "";
        elements.addressLabel.value = address.label || "Home";
        elements.addressRecipient.value = address.recipientName || "";
        elements.addressPhone.value = address.phone || "";
        elements.addressLine.value = address.addressLine || "";
        elements.addressCity.value = address.city || "";
        elements.addressState.value = address.state || "";
        elements.addressCountry.value = address.country || "Nigeria";
        elements.addressDefault.checked = Boolean(address.isDefault);

        if (elements.addressFormTitle) {
            elements.addressFormTitle.textContent = "Edit delivery address";
        }
    }

    elements.addressForm.hidden = false;

    if (elements.showAddressForm) {
        elements.showAddressForm.hidden = true;
    }

    elements.addressRecipient?.focus();
}

function closeAddressForm() {
    if (elements.addressForm) {
        elements.addressForm.hidden = true;
    }

    if (elements.showAddressForm) {
        elements.showAddressForm.hidden = false;
    }

    resetAddressForm();
}

function getAddressFormData() {
    return {
        label: elements.addressLabel?.value.trim() || "Home",
        recipientName: elements.addressRecipient?.value.trim() || "",
        phone: elements.addressPhone?.value.trim() || "",
        addressLine: elements.addressLine?.value.trim() || "",
        city: elements.addressCity?.value.trim() || "",
        state: elements.addressState?.value.trim() || "",
        country: elements.addressCountry?.value.trim() || "",
        isDefault: Boolean(elements.addressDefault?.checked)
    };
}

async function saveAddress(event) {
    event.preventDefault();

    if (addressFormBusy) return;

    hideNotice();

    const data = getAddressFormData();

    const requiredFields = [
        ["recipientName", "Enter the recipient's full name."],
        ["phone", "Enter a phone number for delivery."],
        ["addressLine", "Enter the street address."],
        ["city", "Enter the city."],
        ["state", "Enter the state."],
        ["country", "Enter the country."]
    ];

    for (const [field, message] of requiredFields) {
        if (!data[field]) {
            showNotice(message, "error");
            return;
        }
    }

    const addressId = elements.addressId?.value.trim();
    const endpoint = addressId
        ? `/auth/addresses/${encodeURIComponent(addressId)}`
        : "/auth/addresses";

    const saveButton = elements.addressForm?.querySelector('[type="submit"]');

    addressFormBusy = true;

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        await apiRequest(endpoint, {
            method: addressId ? "PATCH" : "POST",
            body: JSON.stringify(data)
        });

        closeAddressForm();
        await loadAddresses(true);

        showNotice(
            addressId
                ? "Delivery address updated successfully."
                : "Delivery address added successfully.",
            "success"
        );
    } catch (error) {
        console.error("Address save error:", error);
        showNotice(error.message || "Unable to save this address.", "error");
    } finally {
        addressFormBusy = false;

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Address";
        }
    }
}

async function setDefaultAddress(address) {
    const data = {
        label: address.label || "Home",
        recipientName: address.recipientName || "",
        phone: address.phone || "",
        addressLine: address.addressLine || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "",
        isDefault: true
    };

    hideNotice();

    try {
        await apiRequest(`/auth/addresses/${encodeURIComponent(address._id)}`, {
            method: "PATCH",
            body: JSON.stringify(data)
        });

        await loadAddresses(true);
        showNotice("Default delivery address updated.", "success");
    } catch (error) {
        console.error("Default address error:", error);
        showNotice(error.message || "Unable to change the default address.", "error");
    }
}

async function deleteAddress(addressId) {
    if (!addressId) {
        showNotice("This address could not be identified.", "error");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to delete this delivery address?"
    );

    if (!confirmed) return;

    hideNotice();

    try {
        await apiRequest(`/auth/addresses/${encodeURIComponent(addressId)}`, {
            method: "DELETE"
        });

        await loadAddresses(true);
        showNotice("Delivery address deleted.", "success");
    } catch (error) {
        console.error("Address deletion error:", error);
        showNotice(error.message || "Unable to delete this address.", "error");
    }
}

async function logout() {
    const buttons = document.querySelectorAll("#logoutButton, [data-logout]");

    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        await apiRequest("/auth/logout", { method: "POST" });
        window.location.replace(LOGIN_URL);
    } catch (error) {
        if (window.location.pathname.includes("/dashboard/")) {
            console.error("Logout error:", error);
            showNotice(error.message || "Unable to log out. Please try again.", "error");
        }

        buttons.forEach(button => {
            button.disabled = false;
        });
    }
}

document.querySelectorAll("[data-section]").forEach(button => {
    button.addEventListener("click", () => {
        navigateToSection(button.dataset.section);
    });
});

elements.menuToggle?.addEventListener("click", () => {
    if (elements.sidebar?.classList.contains("open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

elements.overlay?.addEventListener("click", closeSidebar);

document.querySelectorAll("#logoutButton, [data-logout]").forEach(button => {
    button.addEventListener("click", logout);
});

elements.profileForm?.addEventListener("submit", saveProfile);

elements.showAddressForm?.addEventListener("click", () => {
    openAddressForm();
});

elements.addressForm?.addEventListener("submit", saveAddress);

document.getElementById("cancelAddressForm")?.addEventListener("click", closeAddressForm);

if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
}

navigateToSection("overview");
loadCustomer();
