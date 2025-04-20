const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Overview stats for Admin dashboard
const getOverview = asyncHandler(async (req, res) => {
  const totalUsers = await prisma.client.count();
  const totalVendors = await prisma.vendor.count();
  const totalEventPlanners = await prisma.eventPlanner.count();
  const totalActiveBookings = await prisma.booking.count({
    where: { status: { in: ["PENDING", "CONFIRMED"] } },
  });
  const totalPayments = await prisma.payment.count();
  const totalFeedback = await prisma.feedback.count();

  res.status(200).json({
    totalUsers,
    totalVendors,
    totalEventPlanners,
    totalActiveBookings,
    totalPayments,
    totalFeedback,
  });
});

module.exports = { getOverview };
