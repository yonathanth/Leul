const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Extend Prisma client to include computed fields
const prismaWithExtensions = prisma.$extends({
  result: {
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
    },
  },
});

// Get payment insights for Admin dashboard
const getPaymentInsights = asyncHandler(async (req, res) => {
  // Total payment statistics
  const [totalPayments, totalAmount, averagePayment] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      _avg: { amount: true },
    }),
  ]);

  // Payment status breakdown and method distribution
  const [paymentStatusBreakdown, paymentMethodDistribution] = await Promise.all(
    [
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        _count: { id: true },
      }),
    ]
  );

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
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Monthly payment trends (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyTrendsRaw = await prisma.$queryRaw`
    SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') as month,
      SUM(amount) as totalAmount,
      COUNT(id) as paymentCount
    FROM Payment
    WHERE createdAt >= ${twelveMonthsAgo}
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
    ORDER BY month ASC
  `;

  const monthlyTrends = monthlyTrendsRaw.map((trend) => ({
    month: trend.month,
    totalAmount: parseFloat(trend.totalAmount),
    paymentCount: trend.paymentCount,
  }));

  // Format recent payments with full names
  const formattedRecentPayments = recentPayments.map((payment) => ({
    ...payment,
    userName: `${payment.user.firstName} ${payment.user.lastName}`,
    recipientName: `${payment.recipient.firstName} ${payment.recipient.lastName}`,
    userEmail: payment.user.email,
    recipientEmail: payment.recipient.email,
  }));

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
    recentPayments: formattedRecentPayments,
    monthlyTrends,
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

  const [payments, summary] = await Promise.all([
    prisma.payment.findMany({
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
        booking: {
          select: {
            id: true,
            eventDate: true,
            service: {
              select: {
                name: true,
                vendor: {
                  select: {
                    businessName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true, adminSplit: true, vendorSplit: true },
      _count: { id: true },
      _avg: { amount: true },
    }),
  ]);

  // Format payments with full names and additional info
  const formattedPayments = payments.map((payment) => ({
    ...payment,
    userName: `${payment.user.firstName} ${payment.user.lastName}`,
    userEmail: payment.user.email,
    recipientName: `${payment.recipient.firstName} ${payment.recipient.lastName}`,
    recipientEmail: payment.recipient.email,
    serviceName: payment.booking?.service?.name,
    vendorName: payment.booking?.service?.vendor?.businessName,
  }));

  res.status(200).json({
    payments: formattedPayments,
    summary: {
      totalPayments: summary._count.id,
      totalAmount: summary._sum.amount || 0,
      averageAmount: summary._avg.amount || 0,
      totalAdminSplit: summary._sum.adminSplit || 0,
      totalVendorSplit: summary._sum.vendorSplit || 0,
    },
  });
});

// Get payments in frontend format
const getPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      booking: {
        select: {
          service: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedPayments = payments.map(payment => ({
    id: payment.id,
    userName: `${payment.user.firstName} ${payment.user.lastName}`,
    amount: payment.amount,
    date: payment.createdAt,
    status: payment.status,
    method: payment.method,
    eventName: payment.booking?.service?.name || 'N/A',
  }));

  res.status(200).json(formattedPayments);
});

module.exports = { getPaymentInsights, getPaymentReport, getPayments };
