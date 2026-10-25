"use strict";

const API_BASE_URL = "https://selfii-universe-api.onrender.com/api";
const LOGIN_URL = "../pages/login.html";

const elements = {
  welcomeName: document.getElementById("welcomeName"),
  summaryName: document.getElementById("summaryName"),
  summaryEmail: document.getElementById("summaryEmail"),
  profileFullName: document.getElementById("profileFullName"),
  profileEmail: document.getElementById("profileEmail"),
  profileRole: document.getElementById("profileRole"),
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

function showNotice(message, type = "info") {
  if (!elements.notice) return;

  elements.notice.textContent = message;
  elements.notice.className = `dashboard-notice ${type}`;
  elements.notice.hidden = false;
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
    const isActive = button.dataset.section === sectionName;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (elements.pageTitle) {
    elements.pageTitle.textContent = sectionTitles[sectionName];
  }

  closeSidebar();
}

function displayUser(user) {
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

  if (elements.profileRole) {
    elements.profileRole.value = role;
  }
}

async function loadCustomer() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });
    console.log("[DASHBOARD AUTH DEBUG]", {
        status: response.status,
        ok: response.ok,
        origin: window.location.origin
    });
    alert("[DASHBOARD ALERT] HTTP " + response.status + " | Origin: " + window.location.origin);

    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      window.location.replace(LOGIN_URL);
      return;
    }

    if (!response.ok || !result.success || !result.user) {
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
  } catch (error) {
    console.error("Customer dashboard error:", error);

    showNotice(
      "We couldn't load your account. Check your connection and try refreshing the page.",
      "error"
    );
  }
}

async function logout() {
  const logoutButtons = document.querySelectorAll(
    "#logoutButton, [data-logout]"
  );

  logoutButtons.forEach(button => {
    button.disabled = true;
  });

  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      window.location.replace(LOGIN_URL);
      return;
    }

    if (response.status === 401) {
      window.location.replace(LOGIN_URL);
      return;
    }

    throw new Error(result.message || "Logout failed.");
  } catch (error) {
    console.error("Logout error:", error);

    showNotice(
      "We couldn't complete logout. Please check your connection and try again.",
      "error"
    );

    logoutButtons.forEach(button => {
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
  const isOpen = elements.sidebar?.classList.contains("open");

  if (isOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

elements.overlay?.addEventListener("click", closeSidebar);

document.querySelectorAll("#logoutButton, [data-logout]").forEach(button => {
  button.addEventListener("click", logout);
});

if (elements.currentYear) {
  elements.currentYear.textContent = new Date().getFullYear();
}

navigateToSection("overview");
loadCustomer();
