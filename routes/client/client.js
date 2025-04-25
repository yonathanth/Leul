const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middleware/authMiddleware");
const prisma = require("../../prisma/client");
const { initializePayment } = require("../../services/chapaService");
const { verifyPayment } = require("../../services/chapaService");

// Start a new conversation with a vendor (restricted to clients)
router.post("/conversation", checkRole(["CLIENT"]), async (req, res) => {
  const { vendorId } = req.body;
  const clientId = req.user.id;

  try {
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: clientId }, { id: vendorId }],
        },
      },
      include: { participants: true },
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// Get all conversations for the client (restricted to clients)
router.get("/conversations", checkRole(["CLIENT"]), async (req, res) => {
  const clientId = req.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: clientId } },
      },
      include: { participants: true, messages: true },
    });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Initiate a payment for an event booking
router.post(
  "/bookings/:bookingId/pay",
  checkRole(["CLIENT"]),
  async (req, res) => {
    const { bookingId } = req.params;
    const clientId = req.user.id;

    try {
      // Fetch the booking with associated service and vendor
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          service: {
            include: { vendor: { include: { user: true } } },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.client.userId !== clientId) {
        return res
          .status(403)
          .json({ error: "Not authorized to pay for this booking" });
      }

      const amount = booking.service.price;
      const vendor = booking.service.vendor;
      const client = await prisma.user.findUnique({ where: { id: clientId } });

      // Initialize payment with Chapa
      const paymentDetails = await initializePayment({
        amount,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        returnUrl: "https://www.google.com", // URL to redirect after payment
        // callbackUrl: `http://localhost:5000/api/client/bookings/${bookingId}/payment-callback`,
        vendorAccount: {
          businessName: vendor.businessName,
          accountName: `${vendor.user.firstName} ${vendor.user.lastName}`, // Assuming vendor's bank account name matches their full name
        },
      });

      // Create a payment record in the database
      await prisma.payment.create({
        data: {
          amount,
          status: "PENDING",
          method: "Chapa",
          transactionId: paymentDetails.tx_ref,
          bookingId: booking.id,
          userId: clientId,
          recipientId: vendor.userId, // Vendor receives 90%
          clientId: booking.clientId,
          vendorId: vendor.id,
          adminSplit: paymentDetails.adminSplit, // 10% to admin
          vendorSplit: paymentDetails.vendorSplit, // 90% to vendor
        },
      });

      // Return the checkout URL for the client to complete payment
      res.status(200).json({ checkoutUrl: paymentDetails.checkoutUrl });
    } catch (error) {
      console.error("Error initiating payment:", error.message);
      res.status(500).json({ error: "Failed to initiate payment" });
    }
  }
);
router.get("/bookings/:bookingId/payment-callback", async (req, res) => {
  const { bookingId } = req.params;
  const { tx_ref } = req.query; // Chapa appends tx_ref to the callback URL

  if (!tx_ref) {
    return res
      .status(400)
      .json({ error: "Transaction reference not provided" });
  }

  try {
    // Verify the payment with Chapa
    const paymentDetails = await verifyPayment(tx_ref);

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { transactionId: tx_ref },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentDetails.status === "success" ? "COMPLETED" : "FAILED",
      },
    });

    if (paymentDetails.status === "success") {
      // Update booking status to CONFIRMED
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // Redirect to a success page (adjust URL as needed)
      res.redirect("http://localhost:3000/payment/success");
    } else {
      // Redirect to a failure page
      res.redirect("http://localhost:3000/payment/failure");
    }
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.redirect("http://localhost:3000/payment/failure");
  }
});

module.exports = router;
