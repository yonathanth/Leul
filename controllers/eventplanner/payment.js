const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// @desc    Get all payments
// @route   GET /api/eventplanner/payments
// @access  Private (Event Planner only)
const getPayments = asyncHandler(async (req, res) => {
  const {
    _start = 0,
    _end = 10,
    _sort = "createdAt",
    _order = "DESC",
    status,
    amount_gte,
    amount_lte,
  } = req.query;

  const where = {};

  // Add filters if provided
  if (status) {
    where.status = status;
  }

  if (amount_gte || amount_lte) {
    where.amount = {};

    if (amount_gte) {
      where.amount.gte = parseFloat(amount_gte);
    }

    if (amount_lte) {
      where.amount.lte = parseFloat(amount_lte);
    }
  }

  // Count total records
  const total = await prisma.payment.count({
    where,
  });

  // Get payments
  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      recipient: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      booking: {
        select: {
          id: true,
          eventDate: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      [_sort]: _order.toLowerCase(),
    },
    skip: Number(_start),
    take: Number(_end) - Number(_start),
  });

  // Transform data for response
  const transformedPayments = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
    transactionId: payment.transactionId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    adminSplit: payment.adminSplit,
    vendorSplit: payment.vendorSplit,
    payer: {
      id: payment.userId,
      firstName: payment.user.firstName,
      lastName: payment.user.lastName,
      email: payment.user.email,
      avatar: payment.user.avatar,
    },
    recipient: {
      id: payment.recipientId,
      firstName: payment.recipient.firstName,
      lastName: payment.recipient.lastName,
      email: payment.recipient.email,
      avatar: payment.recipient.avatar,
    },
    booking: payment.booking
      ? {
          id: payment.booking.id,
          eventDate: payment.booking.eventDate,
          serviceName: payment.booking.service?.name || "Unknown Service",
        }
      : null,
  }));

  res.set("x-total-count", total.toString());
  res.set("Access-Control-Expose-Headers", "x-total-count");
  res.status(200).json(transformedPayments);
});

// @desc    Get payment statistics
// @route   GET /api/eventplanner/payments/stats
// @access  Private (Event Planner only)
const getPaymentStats = asyncHandler(async (req, res) => {
  // Get total payment amounts by status
  const paymentStatusTotals = await prisma.$queryRaw`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(amount) as total
    FROM Payment
    GROUP BY status
  `;

  // Get monthly payment totals for the last 6 months
  const monthlyPayments = await prisma.$queryRaw`
    SELECT 
      MONTH(createdAt) as month,
      YEAR(createdAt) as year,
      COUNT(*) as count,
      SUM(amount) as total
    FROM Payment
    WHERE createdAt > DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY YEAR(createdAt), MONTH(createdAt)
    ORDER BY YEAR(createdAt), MONTH(createdAt)
  `;

  // Get payment method distribution
  const paymentMethods = await prisma.$queryRaw`
    SELECT 
      method,
      COUNT(*) as count,
      SUM(amount) as total
    FROM Payment
    GROUP BY method
  `;

  res.status(200).json({
    paymentStatusTotals,
    monthlyPayments,
    paymentMethods,
  });
});

module.exports = {
  getPayments,
  getPaymentStats,
};
