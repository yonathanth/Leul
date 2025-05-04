const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get Dashboard Data
const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find client profile
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client) {
    res.status(400);
    throw new Error("Client profile not found");
  }

  // Get total payment amount
  const paymentsAggregate = await prisma.payment.aggregate({
    where: {
      userId,
      status: "COMPLETED",
    },
    _sum: {
      amount: true,
    },
  });

  const totalPaymentAmount = paymentsAggregate._sum.amount || 0;

  // Get list of payments
  const payments = await prisma.payment.findMany({
    where: {
      userId,
    },
    include: {
      booking: {
        include: {
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get pending and confirmed bookings
  const pendingBookings = await prisma.booking.findMany({
    where: {
      clientId: client.id,
      status: "PENDING",
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      },
    },
  });

  const confirmedBookings = await prisma.booking.findMany({
    where: {
      clientId: client.id,
      status: "CONFIRMED",
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      },
    },
  });

  // Return dashboard data
  res.status(200).json({
    totalPaymentAmount,
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
      service: payment.booking?.service?.name || "N/A",
      vendor: payment.booking?.service?.vendor?.businessName || "N/A",
    })),
    bookings: {
      pending: {
        count: pendingBookings.length,
        data: pendingBookings.map((booking) => ({
          id: booking.id,
          eventDate: booking.eventDate,
          location: booking.location,
          serviceName: booking.service.name,
          price: booking.service.price,
          vendorName: booking.service.vendor.businessName,
        })),
      },
      confirmed: {
        count: confirmedBookings.length,
        data: confirmedBookings.map((booking) => ({
          id: booking.id,
          eventDate: booking.eventDate,
          location: booking.location,
          serviceName: booking.service.name,
          price: booking.service.price,
          vendorName: booking.service.vendor.businessName,
        })),
      },
    },
  });
});

module.exports = {
  getDashboardData,
};
