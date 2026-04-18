const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');

function getClient() {
    const env = new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
    );
    return new paypal.core.PayPalHttpClient(env);
}

// POST /api/paypal/crear-orden
router.post('/crear-orden', async (req, res) => {
    const { monto } = req.body;

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: parseFloat(monto).toFixed(2)
            },
            description: "Pago Noelia's Glamour"
        }]
    });

    try {
        const order = await getClient().execute(request);
        res.json({ success: true, id: order.result.id });
    } catch (e) {
        console.error('❌ PayPal error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/paypal/capturar-orden
router.post('/capturar-orden', async (req, res) => {
    const { orderID } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);

    try {
        const capture = await getClient().execute(request);
        res.json({ success: true, datos: capture.result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;