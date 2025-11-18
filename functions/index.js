const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { defineSecret } = require("firebase-functions/params");
const { v4: uuidv4 } = require("uuid");
const { StandardCheckoutPayRequest, OrderStatusRequest } = require("pg-sdk-node");
const { initPhonePeClient } = require("./utils/phonepeClient");
const firestore = require("firebase-admin/firestore");

admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = firestore;

// Firebase Secrets
const PHONEPE_CLIENT_ID = defineSecret("PHONEPE_CLIENT_ID");
const PHONEPE_CLIENT_SECRET = defineSecret("PHONEPE_CLIENT_SECRET");
const PHONEPE_CLIENT_VERSION = defineSecret("PHONEPE_CLIENT_VERSION");


const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Create reusable instance
function getPhonePeClient() {
  return initPhonePeClient({
    clientId: PHONEPE_CLIENT_ID.value(),
    clientSecret: PHONEPE_CLIENT_SECRET.value(),
    clientVersion: PHONEPE_CLIENT_VERSION.value(),
    env: "PRODUCTION"
  });
}

/***********************************
 * 1️⃣ Create Payment Order
 ***********************************/
app.post("/api/createPayment", async (req, res) => {
  try {
      const { amount, orderId, userId, userPhone, userName, userEmail,items } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount required" });

    const merchantOrderId = "ORDER_" + uuidv4();
    const redirectUrl = `https://faststationary.in/payment-status?orderId=${merchantOrderId}`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount * 100)
      .redirectUrl(redirectUrl)
      .build();

    const response = await getPhonePeClient().pay(request);
  await db.collection("transactions").doc(merchantOrderId).set({
      orderId:merchantOrderId,
      userId,
      userName: userName || null,
      userEmail: userEmail || null,
      userPhone: userPhone || null,
      amount,
      items,
      status: "PENDING",
      paymentMethod: "PHONEPE",
      environment: "UAT",
      createdAt:FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      orderId: merchantOrderId,
      redirectUrl: response.redirectUrl
    });

  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

/***********************************
 * 2️⃣ Check Status
 ***********************************/
app.post("/api/checkPaymentStatus", async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;

    if (!merchantTransactionId) {
      return res.status(400).json({ error: "merchantTransactionId required" });
    }

    const client = getPhonePeClient(); // StandardCheckoutClient instance

    // 🚀 DIRECTLY CALL getOrderStatus
    const response = await client.getOrderStatus(merchantTransactionId);

await db.collection("transactions").doc(merchantTransactionId).update({
  status: response.state, // ✔ this is fine (string)
  rawResponse: JSON.parse(JSON.stringify(response)), // ✔ required fix
  updatedAt: new Date(),
});

    res.json({
      success: true,
      status: response.state,
      data: response
    });

  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/***********************************
 * 3️⃣ Webhook Callback
 ***********************************/
app.post("/api/callback", async (req, res) => {
  try {
    const payload = req.body;
    const orderId = payload?.payload?.merchantOrderId;

    if (!orderId) return res.status(400).send("Invalid callback");

    await db.collection("transactions").doc(orderId).update({
      callbackData: payload,
      updatedAt: new Date(),
    });

    res.status(200).send("OK");

  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).send("FAIL");
  }
});

exports.api = onRequest(
  {
    secrets: [
      PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_SECRET,
      PHONEPE_CLIENT_VERSION,

    ],
  },
  app
);
