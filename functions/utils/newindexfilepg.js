// functions/index.js — PhonePe Standard Checkout V2 (Sandbox/UAT)
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const qs = require("qs");
const crypto = require("crypto");
const admin = require("firebase-admin");
const firestore = require("firebase-admin/firestore");

admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = firestore;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PHONEPE_CLIENT_ID = defineSecret("PHONEPE_CLIENT_ID");
const PHONEPE_CLIENT_SECRET = defineSecret("PHONEPE_CLIENT_SECRET");
const PHONEPE_CLIENT_VERSION = defineSecret("PHONEPE_CLIENT_VERSION");
const PHONEPE_MERCHANT_ID = defineSecret("PHONEPE_MERCHANT_ID");
const PHONEPE_SALT_KEY = defineSecret("PHONEPE_SALT_KEY");  // if still needed
const PHONEPE_SALT_INDEX = defineSecret("PHONEPE_SALT_INDEX"); // maybe needed if checksum style

const PHONEPE_CONFIG = {
  // Sandbox / UAT base (Standard Checkout V2)
  // documentation shows sandbox prefix: api-preprod.phonepe.com/apis/pg-sandbox/
  baseUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  // endpoints under checkout/v2
  createPaymentPath: "/checkout/v2/pay",
  statusPath: "/checkout/v2/order",       // to be used as /checkout/v2/order/{orderId}/status
  // refund endpoints similarly if you implement
};

async function getAccessToken() {
  const clientId = PHONEPE_CLIENT_ID.value();
  const clientSecret = PHONEPE_CLIENT_SECRET.value();
  const clientVersion = PHONEPE_CLIENT_VERSION.value();
  const body = qs.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    client_version: clientVersion,
    grant_type: "client_credentials",
  });
  const resp = await axios.post(
    `${PHONEPE_CONFIG.baseUrl}/v1/oauth/token`,  // might remain same path for token
    body,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 15000,
    }
  );
  return resp.data.access_token;
}

// Create Payment (V2)
app.post("/createPayment", async (req, res) => {
  try {
    const { amount, orderId, userId, userPhone, userName, userEmail,items } = req.body;

    let merchantId = PHONEPE_MERCHANT_ID.value();
    if (!merchantId.startsWith("TEST-")) merchantId = "TEST-" + merchantId;

    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("Access token not received");

    const payload = {
      merchantId,
      merchantOrderId: orderId,
      amount: Math.round(amount * 100),
      expireAfter: 1200,
      metaInfo: { udf1: `user-${userId}` },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for order ${orderId}`,
        merchantUrls: {
          redirectUrl: `http://localhost:8080/payment-status?orderId=${orderId}`,
        },
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const requestBody = { request: base64Payload };

    const response = await axios.post(
      `${PHONEPE_CONFIG.baseUrl}${PHONEPE_CONFIG.createPaymentPath}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `O-Bearer ${accessToken}`,
          "X-MERCHANT-ID": merchantId,
        },
        timeout: 15000,
      }
    );

    const phonepeResp = response.data;
    console.log(phonepeResp)
    await db.collection("transactions").doc(orderId).set({
      merchantOrderId: orderId,
      orderId:phonepeResp.orderId,
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

    return res.status(200).json({
      success: true,
      data: phonepeResp,
      paymentUrl: phonepeResp?.data?.instrumentResponse?.redirectInfo?.url,
      merchantOrderId: orderId,
    });
  } catch (err) {
    console.error("createPayment error:", err.response?.data || err);
    res.status(500).json({
      success: false,
      message: "Failed",
      error: err.response?.data || err.message,
    });
  }
});

// Check Payment Status (V2)
app.post("/checkPaymentStatus", async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;
    const merchantOrderId=merchantTransactionId;
    if (!merchantOrderId) {
      return res.status(400).json({ success: false, message: "merchantOrderId needed" });
    }

    let merchantId = PHONEPE_MERCHANT_ID.value();
    if (!merchantId.startsWith("TEST-")) {
      merchantId = `TEST-${merchantId}`;
    }
    const accessToken = await getAccessToken();

    const statusUrl = `${PHONEPE_CONFIG.baseUrl}${PHONEPE_CONFIG.statusPath}/${merchantOrderId}/status`;
    // compute checksum if V2 needs one — check docs whether “X-VERIFY” is required in V2.
    const saltKey = PHONEPE_SALT_KEY.value();
    const saltIndex = PHONEPE_SALT_INDEX.value();

    // Example: create checksum header (if required)
    const endpoint = `/checkout/v2/order/${merchantOrderId}/status`;
    const stringToHash = endpoint + saltKey;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const checksum = sha256 + "###" + saltIndex;

   const resp = await axios.get(statusUrl, {
  headers: {
    "Authorization": `O-Bearer ${accessToken}`,
    "X-MERCHANT-ID": merchantId,
  },
  timeout:15000
});

    const body = resp.data;
    // map PhonePe code → your status
    let status = "FAILED";
    if (body.code === "PAYMENT_SUCCESS") status = "SUCCESS";
    else if (body.code === "PAYMENT_PENDING") status = "PENDING";

    // update firestore
    await db.collection("transactions").doc(merchantOrderId).update({
      status,
      statusCheckResponse: body,
      updatedAt:FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, data: body });
  } catch (err) {
    console.error("checkPaymentStatus error:", err.response?.data || err);
    return res.status(500).json({ success: false, message: "Failed status check", error: err.response?.data || err.message });
  }
});

// (callback route may remain similar, only verify with V2 spec)
app.post("/paymentCallback", async (req, res) => {
  // As earlier; you might need to verify signature / “X-VERIFY” header etc as per V2 docs
  // unchanged or slightly modified — consult V2 callback spec
  // rest of your DB update logic can remain similar

});

exports.api = onRequest({
  secrets: [
    PHONEPE_CLIENT_ID,
    PHONEPE_CLIENT_SECRET,
    PHONEPE_CLIENT_VERSION,
    PHONEPE_MERCHANT_ID,
    PHONEPE_SALT_KEY,
    PHONEPE_SALT_INDEX
  ],
}, app);
