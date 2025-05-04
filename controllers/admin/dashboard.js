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

  // Get 5 most recent payments
  const recentPayments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      recipient: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Get 5 most recent feedbacks
  const recentFeedbacks = await prisma.feedback.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      toUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      booking: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  res.status(200).json({
    totalUsers,
    totalVendors,
    totalEventPlanners,
    totalActiveBookings,
    totalPayments,
    recentPayments,
    recentFeedbacks,
  });
});

module.exports = { getOverview };
