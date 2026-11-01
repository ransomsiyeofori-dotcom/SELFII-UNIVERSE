"use strict";

window.SELFII_API_URL =
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://localhost:5000/api"
        : "https://selfii-universe-api.onrender.com/api";
