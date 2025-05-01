const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const { chapa } = require("../../utils/chapa");
const uuid = require("uuid").v4;
const axios = require("axios"); // Add axios for API calls

// Initiate Payment
const initiatePayment = asyncHandler(async (req, res) => {
  const { amount, vendorId, bookingId } = req.body;
  const userId = req.user.id; // Use authenticated user ID

  // Validate input
  if (!amount || !vendorId || !bookingId || !userId) {
    res.status(400);
    throw new Error("Amount, vendor ID, booking ID, and user ID are required");
  }

  // Verify user and client profile
  const client = await prisma.client.findUnique({ where: { userId } });
  if (!client) {
    res.status(400);
    throw new Error("Client profile not found");
  }

  // Verify booking exists and belongs to the client
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { include: { vendor: true } } },
  });

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (booking.clientId !== client.id) {
    res.status(403);
    throw new Error("Unauthorized: Booking does not belong to this client");
  }

  if (booking.service.vendor.id !== vendorId) {
    res.status(400);
    throw new Error("Vendor ID does not match the booking's vendor");
  }

  // Get vendor and admin subaccounts
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { user: true },
  });

  const adminAccount = await prisma.chapaSubaccount.findFirst({
    where: { type: "ADMIN" },
  });

  if (!vendor?.chapaSubaccountId || !adminAccount) {
    res.status(500);
    throw new Error("Payment accounts not configured");
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      amount,
      status: "PENDING",
      method: "CHAPA",
      userId,
      recipientId: vendor.userId,
      vendorId,
      adminSplit: amount * 0.1,
      vendorSplit: amount * 0.9,
      bookingId,
      clientId: client.id,
    },
  });

  // Create Chapa payment
  try {
    const tx_ref = `payment-${payment.id}-${uuid()}`;
    const response = await chapa.post("/transaction/initialize", {
      amount: amount.toString(),
      currency: "ETB",
      email: req.user.email,
      tx_ref,
      callback_url: "http://localhost:5000/api/client/payment/verify", // Local URL for testing
      return_url: "https://www.google.com", // Local URL for testing
      split: {
        type: "percentage",
        subaccounts: [
          { id: adminAccount.accountId, share: 10 },
          { id: vendor.chapaSubaccountId, share: 90 },
        ],
      },
    });

    // Update payment with transaction ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: tx_ref },
    });

    res.status(200).json({
      checkoutUrl: response.data.data.checkout_url,
      paymentId: payment.id,
      tx_ref, // Return tx_ref for polling
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    console.error(
      "Chapa payment error:",
      error.response?.data,
      adminAccount.accountId,
      vendor.chapaSubaccountId
    );
    res.status(500);
    throw new Error("Payment initiation failed");
  }
});

// Verify Payment (New Endpoint for Polling)
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentId, tx_ref } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!paymentId || !tx_ref) {
    res.status(400);
    throw new Error("Payment ID and transaction reference are required");
  }

  // Verify payment exists and belongs to the user
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  if (payment.userId !== userId) {
    res.status(403);
    throw new Error("Unauthorized: Payment does not belong to this user");
  }

  // Query Chapa's verify transaction endpoint
  try {
    const response = await chapa.get(`/transaction/verify/${tx_ref}`);
    const { status, data } = response.data;

    // Map Chapa status to your PaymentStatus enum
    let paymentStatus;
    switch (status.toLowerCase()) {
      case "success":
        paymentStatus = "COMPLETED";
        break;
      case "failed":
      case "fail":
        paymentStatus = "FAILED";
        break;
      case "pending":
        paymentStatus = "PENDING";
        break;
      default:
        paymentStatus = "FAILED";
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        updatedAt: new Date(),
      },
    });

    // Update booking status if payment is successful
    if (
      paymentStatus === "COMPLETED" &&
      payment.booking?.status === "PENDING"
    ) {
      await prisma.booking.update({
        where: { id: payment.booking.id },
        data: { status: "CONFIRMED" },
      });
    }

    res.status(200).json({
      message: "Payment verified",
      paymentId: payment.id,
      status: paymentStatus,
      chapaData: data, // Optional: return Chapa's response for debugging
    });
  } catch (error) {
    console.error("Chapa verify error:", error.response?.data);
    res.status(500);
    throw new Error("Payment verification failed");
  }
});

// Existing Webhook Handler (Optional, for when public URL is available)
const handleWebhook = asyncHandler(async (req, res) => {
  try {
    const chapaSignature = req.headers["chapa-signature"];
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

    const hash = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== chapaSignature) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    const { tx_ref, status } = req.body;

    const payment = await prisma.payment.update({
      where: { transactionId: tx_ref },
      data: {
        status: status === "success" ? "COMPLETED" : "FAILED",
        updatedAt: new Date(),
      },
      include: { vendor: true, user: true, booking: true },
    });

    if (status === "success" && payment.booking?.status === "PENDING") {
      await prisma.booking.update({
        where: { id: payment.booking.id },
        data: { status: "CONFIRMED" },
      });
    }

    res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

module.exports = { initiatePayment, verifyPayment, handleWebhook };
