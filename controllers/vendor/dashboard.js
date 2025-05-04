const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get Dashboard Overview for Vendor
const getDashboardOverview = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id; // Get the vendorId from the Vendor record

  // Fetch total bookings (all bookings assigned to the vendor via AssignedVendor)
  const totalBookings = await prisma.assignedVendor.count({
    where: {
      vendorId,
    },
  });

  // Fetch pending confirmations (bookings with status PENDING)
  const pendingConfirmations = await prisma.assignedVendor.count({
    where: {
      vendorId,
      status: "PENDING",
    },
  });

  // Fetch revenue stats (total revenue from completed payments)
  const payments = await prisma.payment.findMany({
    where: {
      vendorId,
      status: "COMPLETED",
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // Calculate total revenue
  const totalRevenue = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  // Calculate monthly revenue breakdown
  const revenueBreakdown = payments.reduce((acc, payment) => {
    const month = payment.createdAt.toISOString().slice(0, 7); // Format: YYYY-MM
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {});

  const revenueStats = {
    totalRevenue,
    currency: "USD", // Assuming USD, can be dynamic based on your needs
    breakdown: Object.entries(revenueBreakdown).map(([month, revenue]) => ({
      month,
      revenue,
    })),
  };

  // Respond with the dashboard overview data
  res.status(200).json({
    success: true,
    data: {
      vendorId,
      totalBookings,
      pendingConfirmations,
      revenueStats,
    },
  });
});

module.exports = {
  getDashboardOverview,
};
