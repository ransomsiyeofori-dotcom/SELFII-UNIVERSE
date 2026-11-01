"use strict";

/*
 * SELFII UNIVERSE MAINTENANCE GATE
 *
 * Set MAINTENANCE_MODE to false when the website is ready.
 */

const MAINTENANCE_MODE = true;

if (MAINTENANCE_MODE) {
    const maintenanceURL = new URL(
        "../maintenance.html",
        document.currentScript.src
    );

    window.location.replace(maintenanceURL.href);
}
