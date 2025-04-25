const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get payment insights for Admin dashboard
const getPaymentInsights = asyncHandler(async (req, res) => {
  // Total payment statistics
  const totalPayments = await prisma.payment.count();
  const totalAmount = await prisma.payment.aggregate({
    _sum: { amount: true },
  });
  const averagePayment = await prisma.payment.aggregate({
    _avg: { amount: true },
  });

  // Payment status breakdown
  const paymentStatusBreakdown = await prisma.payment.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // Payment method distribution
  const paymentMethodDistribution = await prisma.payment.groupBy({
    by: ["method"],
    _count: { id: true },
  });

  // Split amounts (admin and vendor)
  const splitAmounts = await prisma.payment.aggregate({
    _sum: {
      adminSplit: true,
      vendorSplit: true,
    },
  });

  // Recent payments (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentPayments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      createdAt: true,
      user: { select: { name: true } },
      recipient: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Monthly payment trends (last 12 months)
  const monthlyTrends = await prisma.payment.groupBy({
    by: ["createdAt"],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      createdAt: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  res.status(200).json({
    totalPayments,
    totalAmount: totalAmount._sum.amount || 0,
    averagePayment: averagePayment._avg.amount || 0,
    paymentStatusBreakdown,
    paymentMethodDistribution,
    splitAmounts: {
      adminSplit: splitAmounts._sum.adminSplit || 0,
      vendorSplit: splitAmounts._sum.vendorSplit || 0,
    },
    recentPayments,
    monthlyTrends: monthlyTrends.map((trend) => ({
      month: trend.createdAt.toISOString().slice(0, 7),
      totalAmount: trend._sum.amount,
      paymentCount: trend._count.id,
    })),
  });
});

// Get detailed payment report with filters
const getPaymentReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, method } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  if (status) where.status = status;
  if (method) where.method = method;

  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      transactionId: true,
      adminSplit: true,
      vendorSplit: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      recipient: { select: { name: true, email: true } },
      booking: { select: { id: true, eventDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = await prisma.payment.aggregate({
    where,
    _sum: { amount: true, adminSplit: true, vendorSplit: true },
    _count: { id: true },
    _avg: { amount: true },
  });

  res.status(200).json({
    payments,
    summary: {
      totalPayments: summary._count.id,
      totalAmount: summary._sum.amount || 0,
      averageAmount: summary._avg.amount || 0,
      totalAdminSplit: summary._sum.adminSplit || 0,
      totalVendorSplit: summary._sum.vendorSplit || 0,
    },
  });
});

module.exports = { getPaymentInsights, getPaymentReport };
