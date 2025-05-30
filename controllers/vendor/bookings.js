const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get vendor bookings (filtered by status if provided)
const getVendorBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page = 1, limit = 10 } = req.query;

  // Convert page and limit to integers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (pageNum < 1 || limitNum < 1) {
    res.status(400);
    throw new Error("Page and limit must be positive integers");
  }

  // Get vendor profile
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  // Build query filters
  const queryFilter = {
    service: {
      vendorId: vendor.id,
    },
  };

  // Add status filter if provided
  if (
    status &&
    ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(status)
  ) {
    queryFilter.status = status;
  }

  // Get bookings
  const bookings = await prisma.booking.findMany({
    where: queryFilter,
    include: {
      client: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          basePrice: true,
          category: true,
          description: true,
        },
      },
      serviceTierPrice: true,
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });

  // Count total bookings for pagination
  const totalBookings = await prisma.booking.count({
    where: queryFilter,
  });

  // Format the response
  const formattedBookings = bookings.map((booking) => ({
    id: booking.id,
    eventDate: booking.eventDate,
    location: booking.location || "",
    attendees: booking.attendees || 0,
    specialRequests: booking.specialRequests || "",
    status: booking.status || "PENDING",
    createdAt: booking.createdAt,
    service: booking.service
      ? {
          id: booking.service.id,
          name: booking.service.name || "",
          basePrice: booking.service.basePrice || 0,
          category: booking.service.category || "",
          description: booking.service.description || "",
        }
      : null,
    tier: booking.serviceTierPrice
      ? {
          id: booking.serviceTierPrice.id,
          tier: booking.serviceTierPrice.tier,
          price: booking.serviceTierPrice.price || 0,
          description: booking.serviceTierPrice.description || "",
        }
      : null,
    client: booking.client
      ? {
          id: booking.client.id,
          firstName: booking.client.user?.firstName || "",
          lastName: booking.client.user?.lastName || "",
          email: booking.client.user?.email || "",
          phone: booking.client.user?.phone || "",
          avatar: booking.client.user?.avatar || "",
        }
      : null,
    payments: booking.payments || [],
  }));

  res.status(200).json({
    success: true,
    count: formattedBookings.length,
    pagination: {
      total: totalBookings,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalBookings / limitNum),
    },
    data: formattedBookings,
  });
});

// Get a single booking by ID
const getBookingById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  // Get vendor profile
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  // Get the booking, ensuring it belongs to this vendor
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      service: {
        vendorId: vendor.id,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          basePrice: true,
          category: true,
          description: true,
        },
      },
      serviceTierPrice: true,
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          createdAt: true,
        },
      },
    },
  });

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found or doesn't belong to your services");
  }

  // Format the response
  const formattedBooking = {
    id: booking.id,
    eventDate: booking.eventDate,
    location: booking.location || "",
    attendees: booking.attendees || 0,
    specialRequests: booking.specialRequests || "",
    status: booking.status || "PENDING",
    createdAt: booking.createdAt,
    service: booking.service
      ? {
          id: booking.service.id,
          name: booking.service.name || "",
          basePrice: booking.service.basePrice || 0,
          category: booking.service.category || "",
          description: booking.service.description || "",
        }
      : null,
    tier: booking.serviceTierPrice
      ? {
          id: booking.serviceTierPrice.id,
          tier: booking.serviceTierPrice.tier,
          price: booking.serviceTierPrice.price || 0,
          description: booking.serviceTierPrice.description || "",
        }
      : null,
    client: booking.client
      ? {
          id: booking.client.id,
          firstName: booking.client.user?.firstName || "",
          lastName: booking.client.user?.lastName || "",
          email: booking.client.user?.email || "",
          phone: booking.client.user?.phone || "",
          avatar: booking.client.user?.avatar || "",
        }
      : null,
    payments: booking.payments || [],
  };

  res.status(200).json({
    success: true,
    data: formattedBooking,
  });
});

// Confirm a booking
const confirmBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  // Get vendor profile
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  // Find the booking and make sure it belongs to this vendor
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      service: {
        vendorId: vendor.id,
      },
      status: "PENDING", // Can only confirm PENDING bookings
    },
  });

  if (!booking) {
    res.status(404);
    throw new Error(
      "Booking not found, doesn't belong to your services, or is not in PENDING status"
    );
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
    include: {
      client: {
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
              userId: true,
            },
          },
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  // Here you would typically send an email notification to the client
  // This would be integrated with your notification system

  res.status(200).json({
    message: "Booking confirmed successfully",
    booking: updatedBooking,
  });
});

// Cancel a booking
const cancelBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;
  const { cancellationReason } = req.body;

  if (!cancellationReason) {
    res.status(400);
    throw new Error("Cancellation reason is required");
  }

  // Get vendor profile
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  // Find the booking and make sure it belongs to this vendor
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      service: {
        vendorId: vendor.id,
      },
      status: {
        in: ["PENDING", "CONFIRMED"], // Can only cancel PENDING or CONFIRMED bookings
      },
    },
  });

  if (!booking) {
    res.status(404);
    throw new Error(
      "Booking not found, doesn't belong to your services, or cannot be cancelled"
    );
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      specialRequests: booking.specialRequests
        ? `${booking.specialRequests}\n\nCancellation Reason: ${cancellationReason}`
        : `Cancellation Reason: ${cancellationReason}`,
    },
    include: {
      client: {
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  // Here you would typically send an email notification to the client
  // This would be integrated with your notification system

  res.status(200).json({
    message: "Booking cancelled successfully",
    booking: updatedBooking,
  });
});

// Mark booking as completed
const completeBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  // Get vendor profile
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  // Find the booking and make sure it belongs to this vendor
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      service: {
        vendorId: vendor.id,
      },
      status: "CONFIRMED", // Can only complete CONFIRMED bookings
    },
  });

  if (!booking) {
    res.status(404);
    throw new Error(
      "Booking not found, doesn't belong to your services, or is not in CONFIRMED status"
    );
  }

  // Check if the event date has passed
  const today = new Date();
  if (booking.eventDate > today) {
    res.status(400);
    throw new Error("Cannot mark a booking as completed before the event date");
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
    include: {
      client: {
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  // Here you would typically send an email notification to the client
  // This would be integrated with your notification system

  res.status(200).json({
    message: "Booking marked as completed successfully",
    booking: updatedBooking,
  });
});

module.exports = {
  getVendorBookings,
  getBookingById,
  confirmBooking,
  cancelBooking,
  completeBooking,
};
