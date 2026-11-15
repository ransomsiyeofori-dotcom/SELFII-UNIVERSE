const { Resend } = require('resend');

const ALLOWED_SUBJECTS = [
    'General enquiry',
    'Order enquiry',
    'Boutique',
    'Personalised gifts',
    'Custom clothing printing',
    'Bulk or business order',
    'Design request',
    'Other'
];

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

exports.submitContactMessage = async (req, res) => {
    const {
        name,
        email,
        subject,
        orderNumber = '',
        message,
        consent
    } = req.body || {};

    if (
        typeof name !== 'string' ||
        typeof email !== 'string' ||
        typeof subject !== 'string' ||
        typeof orderNumber !== 'string' ||
        typeof message !== 'string' ||
        consent !== true
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please complete all required fields and agree to the contact terms.'
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject = subject.trim();
    const cleanOrderNumber = orderNumber.trim();
    const cleanMessage = message.trim();

    if (
        !cleanName ||
        cleanName.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
        cleanEmail.length > 254 ||
        !ALLOWED_SUBJECTS.includes(cleanSubject) ||
        cleanOrderNumber.length > 100 ||
        cleanMessage.length < 10 ||
        cleanMessage.length > 3000
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please check your details and try again.'
        });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const toEmail = process.env.RESEND_TO_EMAIL;

    if (!apiKey || !fromEmail || !toEmail) {
        console.error('Contact email delivery is not configured.');
        return res.status(503).json({
            success: false,
            message: 'Our contact service is temporarily unavailable. Please email selfiitees@gmail.com.'
        });
    }

    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail);
    const safeSubject = escapeHtml(cleanSubject);
    const safeOrderNumber = escapeHtml(cleanOrderNumber);
    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, '<br>');

    try {
        const resend = new Resend(apiKey);

        const { error } = await resend.emails.send({
            from: fromEmail,
            to: [toEmail],
            replyTo: cleanEmail,
            subject: `SELFII Contact: ${cleanSubject}`,
            html: `
                <div style="font-family:Arial,sans-serif;color:#24211E;line-height:1.7;">
                    <h2>New SELFII UNIVERSE enquiry</h2>
                    <p><strong>Name:</strong> ${safeName}</p>
                    <p><strong>Email:</strong> ${safeEmail}</p>
                    <p><strong>Subject:</strong> ${safeSubject}</p>
                    <p><strong>Order number:</strong> ${safeOrderNumber || 'Not provided'}</p>
                    <hr>
                    <p><strong>Message:</strong></p>
                    <p>${safeMessage}</p>
                </div>
            `,
            text: `New SELFII UNIVERSE enquiry

Name: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}
Order number: ${cleanOrderNumber || 'Not provided'}

Message:
${cleanMessage}`
        });

        if (error) {
            throw new Error(error.message || 'Email delivery failed.');
        }

        return res.status(200).json({
            success: true,
            message: 'Thank you for contacting SELFII UNIVERSE. Your message has been sent successfully.'
        });
    } catch (error) {
        console.error('Contact email delivery failed:', error.message);

        return res.status(502).json({
            success: false,
            message: 'We could not send your message right now. Please try again shortly.'
        });
    }
};
