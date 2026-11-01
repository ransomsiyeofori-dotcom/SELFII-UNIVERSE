"use strict";

/*
 * SELFII UNIVERSE MAINTENANCE GATE
 *
 * Set MAINTENANCE_MODE to false when the website is ready.
 * Password recovery remains accessible during maintenance.
 */

const MAINTENANCE_MODE = true;

const allowedDuringMaintenance = [
    "forgot-password.html",
    "reset-password.html"
];

const currentPage = window.location.pathname
    .split("/")
    .pop()
    .toLowerCase();

if (
    MAINTENANCE_MODE &&
    !allowedDuringMaintenance.includes(currentPage)
) {
    const maintenanceURL = new URL(
        "../maintenance.html",
        document.currentScript.src
    );

    window.location.replace(maintenanceURL.href);
}
