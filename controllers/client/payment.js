const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const { chapa } = require("../../utils/chapa");
const uuid = require("uuid").v4;

const initiatePayment = asyncHandler(async (req, res) => {
  const { amount, vendorId, userId, bookingId } = req.body;

  // Validate input
  if (!amount || !vendorId || !bookingId) {
    res.status(400);
    throw new Error("Amount, vendor ID, and booking ID are required");
  }

  // Verify booking exists and is valid
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: { include: { vendor: true } } },
  });

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
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
      bookingId, // Associate payment with booking
      clientId: booking.clientId, // Optionally link to client
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
      callback_url: "https://google.com",
      return_url: "https://google.com",
      split: {
        type: "percentage",
        subaccounts: [
          {
            id: adminAccount.accountId,
            share: 10, // 10% for admin
          },
          {
            id: vendor.chapaSubaccountId,
            share: 90, // 90% for vendor
          },
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

const handleWebhook = asyncHandler(async (req, res) => {
  try {
    // 1. Verify signature
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

    // 2. Process webhook
    const { tx_ref, status } = req.body;

    const payment = await prisma.payment.update({
      where: { transactionId: tx_ref },
      data: {
        status: status === "success" ? "COMPLETED" : "FAILED",
        updatedAt: new Date(),
      },
      include: {
        vendor: true,
        user: true,
      },
    });

    // 3. Add any post-payment logic here
    if (status === "success") {
      console.log(`Payment ${tx_ref} completed successfully`);
      // Send confirmation emails, update vendor balance, etc.
    }

    res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

module.exports = { initiatePayment, handleWebhook };
