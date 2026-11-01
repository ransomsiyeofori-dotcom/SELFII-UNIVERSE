"use strict";

const SELFII_CONTACT = {
    phone: "07012096260",
    internationalPhone: "2347012096260"
};

// WhatsApp Business
const whatsappButton = document.getElementById("whatsappButton");

if (whatsappButton) {
    const message = encodeURIComponent(
        "Hello SELFII UNIVERSE! I visited your website and would like to make an enquiry."
    );

    whatsappButton.href =
        `https://wa.me/${SELFII_CONTACT.internationalPhone}?text=${message}`;

    whatsappButton.target = "_blank";
    whatsappButton.rel = "noopener noreferrer";
}

// Phone call
const callButton = document.getElementById("callButton");

if (callButton) {
    callButton.href = `tel:${SELFII_CONTACT.phone}`;
}

// Automatic copyright year
const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

// Floating particles
const particlesContainer = document.getElementById("particles");

if (particlesContainer) {
    const particleCount = 28;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("span");

        particle.className = "particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${9 + Math.random() * 13}s`;
        particle.style.animationDelay = `${Math.random() * 12}s`;
        particle.style.width = `${2 + Math.random() * 3}px`;
        particle.style.height = particle.style.width;

        particlesContainer.appendChild(particle);
    }
}
