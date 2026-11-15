(function initializeSharedStorefrontHeader() {

"use strict";

// ==========================================
// SELFII UNIVERSE — SHARED STOREFRONT HEADER
// ==========================================

const isPagesDirectory = window.location.pathname.includes("/pages/");
const rootPath = isPagesDirectory ? "../" : "";

// MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");
const mobileNav = document.getElementById("mobileNav");

if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = mobileNav.classList.toggle("active");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.innerHTML = isOpen
            ? '<i class="fa-solid fa-xmark"></i>'
            : '<i class="fa-solid fa-bars"></i>';
    });

    mobileNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileNav.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        });
    });
}

// SEARCH PANEL

const searchToggle = document.getElementById("searchToggle");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchToggle && searchForm) {
    searchToggle.addEventListener("click", () => {
        const isOpen = searchForm.classList.toggle("active");

        searchToggle.setAttribute("aria-expanded", String(isOpen));

        if (isOpen && searchInput) {
            searchInput.focus();
        }
    });
}

// ACCOUNT MENU

(async function initializeStorefrontAccount() {
    const API = window.SELFII_API_URL || "/api";

    const menu = document.getElementById("accountMenu");
    const link = document.getElementById("accountLink");
    const dropdown = document.getElementById("accountDropdown");
    const name = document.getElementById("accountDropdownName");
    const email = document.getElementById("accountDropdownEmail");
    const photo = document.getElementById("accountDropdownPhoto");
    const placeholder = document.getElementById("accountDropdownPlaceholder");
    const signOut = document.getElementById("accountSignOut");

    if (!menu || !link || !dropdown) return;

    const loginUrl = `${rootPath}pages/login.html`;
    const homeUrl = `${rootPath}index.html`;

    let loggedIn = false;

    function displayPhoto(url) {
        link.replaceChildren();

        if (url) {
            const image = document.createElement("img");
            image.className = "account-profile-photo";
            image.src = url;
            image.alt = "My profile photo";

            image.onerror = () => {
                image.remove();
                link.innerHTML = '<i class="fa-regular fa-user"></i>';
            };

            link.appendChild(image);
        } else {
            link.innerHTML = '<i class="fa-regular fa-user"></i>';
        }

        if (photo && placeholder) {
            photo.hidden = !url;
            placeholder.hidden = Boolean(url);

            if (url) {
                photo.src = url;
                photo.onerror = () => {
                    photo.hidden = true;
                    placeholder.hidden = false;
                };
            } else {
                photo.removeAttribute("src");
            }
        }
    }

    function closeDropdown() {
        dropdown.hidden = true;
        link.setAttribute("aria-expanded", "false");
    }

    link.href = loginUrl;

    link.addEventListener("click", event => {
        if (!loggedIn) return;

        event.preventDefault();
        dropdown.hidden = !dropdown.hidden;
        link.setAttribute("aria-expanded", String(!dropdown.hidden));
    });

    document.addEventListener("click", event => {
        if (!menu.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });

    try {
        displayPhoto(localStorage.getItem("selfiiProfilePhotoUrl") || "");
    } catch (error) {
        console.warn("Could not read the saved profile photo:", error);
    }

    try {
        const response = await fetch(`${API}/auth/me`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) return;

        const result = await response.json();

        if (!result.success || !result.user) return;

        const user = result.user;
        loggedIn = true;

        link.href = "#";
        link.setAttribute("aria-label", "Open account menu");
        link.setAttribute("title", "My Account");

        if (name) name.textContent = user.fullName || "My Account";
        if (email) email.textContent = user.email || "";

        displayPhoto(user.profilePhotoUrl || "");

        try {
            if (user.profilePhotoUrl) {
                localStorage.setItem(
                    "selfiiProfilePhotoUrl",
                    user.profilePhotoUrl
                );
            } else {
                localStorage.removeItem("selfiiProfilePhotoUrl");
            }
        } catch (error) {
            console.warn("Could not save the profile photo URL:", error);
        }

    } catch (error) {
        console.error("Could not load storefront account:", error);
    }

    if (signOut) {
        signOut.addEventListener("click", async () => {
            signOut.disabled = true;

            try {
                const response = await fetch(`${API}/auth/logout`, {
                    method: "POST",
                    credentials: "include",
                    headers: { Accept: "application/json" }
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok || result.success === false) {
                    throw new Error(result.message || "Sign out failed.");
                }

                window.location.replace(homeUrl);

            } catch (error) {
                console.error("Sign out failed:", error);
                alert(error.message || "Unable to sign out. Please try again.");
                signOut.disabled = false;
            }
        });
    }
})();


})();
