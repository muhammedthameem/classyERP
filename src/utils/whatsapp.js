export async function sendWhatsApp(phone, customerName, orderId) {
    const accessToken = "EAAYcDaZCDKysBRnbRglxZBZBn5SKxlTyCnZBnPKdmKpuxsqzhIqUgoRtdE4aZBeOC5hDhufPn3ImHTBvRD6PMPpAwRNYINPXpGLje5kmaaJaQxC3eWqXoUvhygZC0EwhPnCBaTnyWGMiKFpJDmPpbwCEgJcgBp8oJ0fFCL0UDj0MD2uGXVZBrUzKogjhoZBXGsisYHJivKBg9OSkxa9ii6WZAKvbkvppm9DECKVzpkhiDaPETyRZAuWBymX0uu3nIHblvkImKNm5ZBy3DHlR0kmABjObV0l";
    const phoneNumberId = "1119127341285536";

    // Format phone number: remove non-digits, ensure country code 91 if exactly 10 digits
    let formattedPhone = phone ? String(phone).replace(/\D/g, '') : '';
    if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
    }

    if (!formattedPhone) return;

    const messageText = `Hi ${customerName || 'Customer'} Your Item (${orderId}) ready for delivery please collect it\n\nThank you\nClassy Couture`;

    try {
        const response = await fetch(
            `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: formattedPhone,
                    type: "text",
                    text: {
                        preview_url: false,
                        body: messageText
                    },
                }),
            }
        );

        const data = await response.json();
        console.log("WhatsApp API Response:", data);
        return data;
    } catch (err) {
        console.error("WhatsApp API Error:", err);
    }
}
