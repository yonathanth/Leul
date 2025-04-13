const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Give Feedback and Rating
const giveFeedback = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const userId = req.user.id; // Assumes user ID from auth middleware

  // Validate required fields
  if (!bookingId || !rating) {
    res.status(400);
    throw new Error("Booking ID and rating are required");
  }

  // Validate rating is 1-5
  const ratingNum = parseInt(rating, 10);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    res.status(400);
    throw new Error("Rating must be an integer between 1 and 5");
  }

  // Find client profile
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client) {
    res.status(400);
    throw new Error("Client profile not found");
  }

  // Validate booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: true,
      service: { include: { vendor: { include: { user: true } } } },
    },
  });

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (booking.clientId !== client.id) {
    res.status(403);
    throw new Error("You can only provide feedback for your own bookings");
  }

  if (booking.status !== "COMPLETED") {
    res.status(400);
    throw new Error("Feedback can only be provided for completed bookings");
  }

  // Check for existing feedback
  const existingFeedback = await prisma.feedback.findFirst({
    where: { bookingId, fromUserId: userId },
  });

  if (existingFeedback) {
    res.status(400);
    throw new Error("Feedback already provided for this booking");
  }

  // Create feedback
  const feedback = await prisma.feedback.create({
    data: {
      rating: ratingNum,
      comment,
      bookingId,
      fromUserId: userId,
      toUserId: booking.service.vendor.userId,
      vendorId: booking.service.vendorId,
      clientId: client.id,
    },
    include: {
      booking: {
        select: {
          eventDate: true,
          location: true,
          service: { select: { name: true, price: true } },
        },
      },
      toUser: { select: { firstName: true, lastName: true } },
      vendor: { select: { businessName: true } },
    },
  });

  // Update vendor rating (average of all feedback ratings)
  const vendorFeedbacks = await prisma.feedback.findMany({
    where: { vendorId: booking.service.vendorId },
    select: { rating: true },
  });

  const averageRating =
    vendorFeedbacks.length > 0
      ? vendorFeedbacks.reduce((sum, f) => sum + f.rating, 0) /
        vendorFeedbacks.length
      : 0;

  await prisma.vendor.update({
    where: { id: booking.service.vendorId },
    data: { rating: Number(averageRating.toFixed(2)) },
  });

  res.status(201).json({
    message: "Feedback submitted successfully",
    feedback: {
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      booking: {
        id: feedback.booking.id,
        eventDate: feedback.booking.eventDate,
        location: feedback.booking.location,
        serviceName: feedback.booking.service.name,
      },
      vendor: {
        businessName: feedback.vendor.businessName,
        ownerName: `${feedback.toUser.firstName} ${feedback.toUser.lastName}`,
      },
    },
  });
});

module.exports = { giveFeedback };
