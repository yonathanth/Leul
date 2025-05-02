const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get the vendor's payment status (received and pending payments)
const getPayments = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;

  // Extract query parameters for filtering
  const { status, startDate, endDate } = req.query;

  // Build the query filter
  const paymentFilter = { vendorId };

  // Filter by status if provided
  if (status) {
    const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      res.status(400);
      throw new Error(
        "Invalid status. Must be PENDING, COMPLETED, FAILED, or REFUNDED"
      );
    }
    paymentFilter.status = status.toUpperCase();
  }

  // Filter by date range if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400);
      throw new Error("Invalid date format for startDate or endDate");
    }

    if (start >= end) {
      res.status(400);
      throw new Error("startDate must be before endDate");
    }

    paymentFilter.createdAt = {
      gte: start,
      lte: end,
    };
  }

  // Fetch all payments without pagination
  const payments = await prisma.payment.findMany({
    where: paymentFilter,
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      bookingId: true,
    },
  });

  // Separate received and pending payments
  const receivedPayments = payments
    .filter((payment) => payment.status === "COMPLETED")
    .map((payment) => ({
      paymentId: payment.id,
      eventId: payment.bookingId,
      amount: payment.amount,
      currency: "ETB",
      status: payment.status.toLowerCase(),
      receivedAt: payment.createdAt.toISOString(),
    }));

  const pendingPayments = payments
    .filter((payment) => payment.status === "PENDING")
    .map((payment) => ({
      paymentId: payment.id,
      eventId: payment.bookingId,
      amount: payment.amount,
      currency: "ETB",
      status: payment.status.toLowerCase(),
    }));

  // Respond with the payment data
  res.status(200).json({
    success: true,
    data: {
      vendorId,
      receivedPayments,
      pendingPayments,
      totalPayments: payments.length, // Optional: include total count if needed
    },
  });
});

module.exports = {
  getPayments,
};
