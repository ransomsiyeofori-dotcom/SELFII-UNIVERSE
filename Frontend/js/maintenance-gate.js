"use strict";

/*
 * SELFII UNIVERSE MAINTENANCE GATE
 * Only SELFII Tees and password recovery remain accessible.
 */

const MAINTENANCE_MODE = false;

const allowedDuringMaintenance = [
    "selfiitees.html",
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
