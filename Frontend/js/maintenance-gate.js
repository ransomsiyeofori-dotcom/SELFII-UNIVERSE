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


/* SELFII GLOBAL PRELOADER */
(function () {
    if (document.documentElement.classList.contains("selfii-preloading")) return;

    document.documentElement.classList.add("selfii-preloading");

    const style = document.createElement("style");
    style.textContent = `
        html.selfii-preloading {
            overflow: hidden !important;
        }

        html.selfii-preloading::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 999998;
            background: #17262D;
            opacity: 1;
            transition: opacity 0.45s ease, visibility 0.45s ease;
        }

        html.selfii-preloading::after {
            content: "";
            position: fixed;
            z-index: 999999;
            top: calc(50% - 57px);
            left: calc(50% - 22px);
            width: 44px;
            height: 44px;
            border: 3px solid rgba(247,244,236,0.2);
            border-top-color: #BF5B40;
            border-radius: 50%;
            animation: selfiiLoaderSpin 0.85s linear infinite;
            transition: opacity 0.35s ease;
        }

        html.selfii-preloading body::before {
            content: "SELFII UNIVERSE\\A CREATIVITY, MADE PERSONAL";
            white-space: pre;
            position: fixed;
            z-index: 1000000;
            top: calc(50% + 12px);
            left: 0;
            width: 100%;
            text-align: center;
            color: #F7F4EC;
            font-family: Georgia, serif;
            font-size: 19px;
            font-weight: 600;
            letter-spacing: 4px;
            line-height: 2.4;
            pointer-events: none;
        }

        html.selfii-preloader-hiding::before,
        html.selfii-preloader-hiding::after,
        html.selfii-preloader-hiding body::before {
            opacity: 0;
        }

        @keyframes selfiiLoaderSpin {
            to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
            html.selfii-preloading::after {
                animation: none;
            }
        }
    `;

    (document.head || document.documentElement).appendChild(style);

    let finished = false;
    const preloaderStarted = Date.now();

    function hidePreloader() {
        if (finished) return;
        finished = true;

        const remaining = Math.max(0, 1500 - (Date.now() - preloaderStarted));

        setTimeout(function () {
        document.documentElement.classList.add("selfii-preloader-hiding");

        setTimeout(function () {
            document.documentElement.classList.remove(
                "selfii-preloading",
                "selfii-preloader-hiding"
            );
            style.remove();
        }, 500);
        }, remaining);
    }

    if (document.readyState === "complete") {
        hidePreloader();
    } else {
        window.addEventListener("load", hidePreloader, { once: true });
    }

    setTimeout(hidePreloader, 12000);
})();
