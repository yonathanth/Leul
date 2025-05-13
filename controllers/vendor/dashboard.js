const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get Dashboard Overview for Vendor
const getDashboardOverview = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
    include: {
      services: true,
    },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;
  const serviceIds = vendor.services.map((service) => service.id);

  // If vendor is not approved, return basic info with status
  if (vendor.status !== "APPROVED") {
    return res.status(200).json({
      success: true,
      data: {
        vendorId,
        businessName: vendor.businessName,
        serviceType: vendor.serviceType,
        status: vendor.status,
        message:
          "Your account is pending approval. You'll have access to full dashboard features once approved.",
      },
    });
  }

  // Get all bookings for this vendor's services
  const bookingsData = await prisma.booking.findMany({
    where: {
      serviceId: {
        in: serviceIds,
      },
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
        },
      },
      client: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  // Get pending bookings
  const pendingBookings = bookingsData.filter(
    (booking) => booking.status === "PENDING"
  );

  // Get confirmed bookings
  const confirmedBookings = bookingsData.filter(
    (booking) => booking.status === "CONFIRMED"
  );

  // Get completed bookings
  const completedBookings = bookingsData.filter(
    (booking) => booking.status === "COMPLETED"
  );

  // Format booking data
  const formatBookingData = (booking) => ({
    id: booking.id,
    status: booking.status,
    eventDate: booking.eventDate,
    location: booking.location,
    attendees: booking.attendees,
    specialRequests: booking.specialRequests,
    createdAt: booking.createdAt,
    service: {
      name: booking.service.name,
      price: booking.service.price,
    },
    client: {
      name: `${booking.client.user.firstName} ${booking.client.user.lastName}`,
      email: booking.client.user.email,
      phone: booking.client.user.phone,
    },
  });

  // Fetch revenue data (payments)
  const payments = await prisma.payment.findMany({
    where: {
      vendorId,
      status: "COMPLETED",
    },
  });

  // Calculate total revenue
  const totalRevenue = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  // Monthly revenue breakdown
  const revenueBreakdown = payments.reduce((acc, payment) => {
    const month = payment.createdAt.toISOString().slice(0, 7); // Format: YYYY-MM
    acc[month] = (acc[month] || 0) + payment.amount;
    return acc;
  }, {});

  // Get vendor rating (from the vendor object)
  const rating = vendor.rating || 0;

  // Get number of chats created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chatsToday = await prisma.conversation.count({
    where: {
      participants: {
        some: {
          id: req.user.id,
        },
      },
      createdAt: {
        gte: today,
      },
    },
  });

  // Respond with the dashboard overview data
  res.status(200).json({
    success: true,
    data: {
      vendorId,
      businessName: vendor.businessName,
      serviceType: vendor.serviceType,
      status: vendor.status,
      rating,
      totalBookings: bookingsData.length,
      pendingBookings: {
        count: pendingBookings.length,
        data: pendingBookings.map(formatBookingData),
      },
      confirmedBookings: {
        count: confirmedBookings.length,
        data: confirmedBookings.map(formatBookingData),
      },
      completedBookings: {
        count: completedBookings.length,
        data: completedBookings.map(formatBookingData),
      },
      allBookings: {
        count: bookingsData.length,
        data: bookingsData.map(formatBookingData),
      },
      revenue: {
        total: totalRevenue,
        currency: "ETB", // Ethiopian Birr
        breakdown: Object.entries(revenueBreakdown).map(([month, amount]) => ({
          month,
          amount,
        })),
      },
      chatsToday,
      servicesCount: vendor.services.length,
    },
  });
});

module.exports = {
  getDashboardOverview,
};
