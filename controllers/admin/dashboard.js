const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Overview stats for Admin dashboard
const getOverview = asyncHandler(async (req, res) => {
  // Get current counts
  const [totalClients, totalVendors, totalEventPlanners, activeBookings] =
    await Promise.all([
      prisma.client.count(),
      prisma.vendor.count(),
      prisma.eventPlanner.count(),
      prisma.booking.count({
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
      }),
    ]);

  // Get counts from 30 days ago for growth calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    previousClients,
    previousVendors,
    previousEventPlanners,
    previousActiveBookings,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        user: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      },
    }),
    prisma.vendor.count({
      where: {
        user: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      },
    }),
    prisma.eventPlanner.count({
      where: {
        user: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      },
    }),
    prisma.booking.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        createdAt: { lt: thirtyDaysAgo },
      },
    }),
  ]);

  // Calculate growth percentages
  const calculateGrowth = (current, previous) => {
    if (previous === 0) return 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  res.status(200).json({
    totalClients,
    clientGrowth: calculateGrowth(totalClients, previousClients),
    totalVendors,
    vendorGrowth: calculateGrowth(totalVendors, previousVendors),
    totalEventPlanners,
    eventPlannerGrowth: calculateGrowth(
      totalEventPlanners,
      previousEventPlanners
    ),
    activeBookings,
    bookingGrowth: calculateGrowth(activeBookings, previousActiveBookings),
  });
});

module.exports = { getOverview };
