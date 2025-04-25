const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const { chapa } = require("../../utils/chapa");
const uuid = require("uuid").v4;

const initiatePayment = asyncHandler(async (req, res) => {
  const { amount, vendorId, userId } = req.body;

  // Validate input
  if (!amount || !vendorId) {
    res.status(400);
    throw new Error("Amount and vendor ID are required");
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
      callback_url: `https://google.com`,
      subaccounts: {
        id: adminAccount.accountId,
        id: vendor.chapaSubaccountId,
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

module.exports = { initiatePayment };
