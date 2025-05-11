const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Helper function to convert BigInt values to regular numbers
const convertBigIntsToNumbers = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
};

// @desc    Get dashboard statistics for event planner
// @route   GET /api/eventplanner/dashboard
// @access  Private (Event Planner only)
const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // Get total counts
    const totalVendors = await prisma.vendor.count();
    const totalClients = await prisma.client.count();
    const totalBookings = await prisma.booking.count();
    const totalPayments = await prisma.payment.count();

    // Get recent vendors (newest first)
    const recentVendors = await prisma.vendor.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        user: {
          createdAt: "desc",
        },
      },
      take: 5,
    });

    // Get recent clients
    const recentClients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        user: {
          createdAt: "desc",
        },
      },
      take: 5,
    });

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        service: {
          include: {
            vendor: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Calculate booking statistics by status
    let bookingStats = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM Booking
      GROUP BY status
    `;

    // Convert BigInt to Number
    bookingStats = convertBigIntsToNumbers(bookingStats);

    // Calculate recent payment statistics
    let paymentStats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total
      FROM Payment
      GROUP BY status
    `;

    // Convert BigInt to Number
    paymentStats = convertBigIntsToNumbers(paymentStats);

    // Get monthly revenue data for charts
    let monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        MONTH(createdAt) as month, 
        YEAR(createdAt) as year,
        SUM(amount) as total
      FROM Payment
      WHERE status = 'COMPLETED'
      AND createdAt > DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY MONTH(createdAt), YEAR(createdAt)
      ORDER BY YEAR(createdAt), MONTH(createdAt)
    `;

    // Convert BigInt to Number
    monthlyRevenue = convertBigIntsToNumbers(monthlyRevenue);

    // Get top vendor categories
    let topVendorCategories = await prisma.$queryRaw`
      SELECT 
        serviceType, 
        COUNT(*) as count
      FROM Vendor
      GROUP BY serviceType
      ORDER BY count DESC
      LIMIT 5
    `;

    // Convert BigInt to Number
    topVendorCategories = convertBigIntsToNumbers(topVendorCategories);

    res.status(200).json({
      totalVendors,
      totalClients,
      totalBookings,
      totalPayments,
      recentVendors,
      recentClients,
      recentBookings,
      bookingStats,
      paymentStats,
      monthlyRevenue,
      topVendorCategories,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500);
    throw new Error("Error retrieving dashboard data");
  }
});

module.exports = {
  getDashboardStats,
};
