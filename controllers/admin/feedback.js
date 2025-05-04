const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Review Complaints
const reviewComplaints = asyncHandler(async (req, res) => {
  // Fetch feedback likely to be complaints (rating <= 3 or has comment)
  const complaints = await prisma.feedback.findMany({
    where: {
      OR: [
        { rating: { lte: 3 } }, // Low ratings (1-3)
        { comment: { not: null } }, // Feedback with comments
      ],
      OR: [
        { fromUser: { role: "CLIENT" } }, // Feedback given by clients
        { clientId: { not: null } }, // Feedback about clients
      ],
    },
    include: {
      fromUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      toUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      vendor: { select: { id: true, businessName: true } },
      client: { select: { id: true } },
      booking: {
        select: {
          id: true,
          eventDate: true,
          status: true,
          service: { select: { name: true, price: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format response
  const formattedComplaints = complaints.map((feedback) => ({
    id: feedback.id,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.createdAt,
    fromUser: {
      id: feedback.fromUser.id,
      email: feedback.fromUser.email,
      name: `${feedback.fromUser.firstName} ${feedback.fromUser.lastName}`,
      role: feedback.fromUser.role,
    },
    toUser: {
      id: feedback.toUser.id,
      email: feedback.toUser.email,
      name: `${feedback.toUser.firstName} ${feedback.toUser.lastName}`,
      role: feedback.toUser.role,
    },
    vendor: feedback.vendor
      ? { id: feedback.vendor.id, businessName: feedback.vendor.businessName }
      : null,
    booking: {
      id: feedback.booking.id,
      eventDate: feedback.booking.eventDate,
      status: feedback.booking.status,
      serviceName: feedback.booking.service.name,
    },
  }));

  res.status(200).json({
    message: "Complaints retrieved successfully",
    complaints: formattedComplaints,
  });
});

// Review Ratings
const reviewRatings = asyncHandler(async (req, res) => {
  // Fetch all feedback involving clients
  const feedbacks = await prisma.feedback.findMany({
    where: {
      OR: [
        { fromUser: { role: "CLIENT" } }, // Feedback given by clients
        { clientId: { not: null } }, // Feedback about clients
      ],
    },
    include: {
      fromUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      toUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      vendor: { select: { id: true, businessName: true } },
      client: { select: { id: true } },
      booking: { select: { id: true, eventDate: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate summary stats
  const totalFeedback = feedbacks.length;
  const averageRating =
    totalFeedback > 0
      ? Number(
          (
            feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
          ).toFixed(2)
        )
      : 0;

  // Group by client (for feedback given or received)
  const clientStats = await prisma.feedback.groupBy({
    by: ["clientId"],
    where: { clientId: { not: null } },
    _avg: { rating: true },
    _count: { id: true },
  });

  const formattedClientStats = await Promise.all(
    clientStats.map(async (stat) => {
      const client = await prisma.client.findUnique({
        where: { id: stat.clientId },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });
      return {
        clientId: stat.clientId,
        email: client?.user.email,
        name: client
          ? `${client.user.firstName} ${client.user.lastName}`
          : "Unknown",
        averageRating: Number(stat._avg.rating.toFixed(2)),
        totalFeedback: stat._count.id,
      };
    })
  );

  // Format feedback details
  const formattedFeedbacks = feedbacks.map((feedback) => ({
    id: feedback.id,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.createdAt,
    fromUser: {
      id: feedback.fromUser.id,
      email: feedback.fromUser.email,
      name: `${feedback.fromUser.firstName} ${feedback.fromUser.lastName}`,
      role: feedback.fromUser.role,
    },
    toUser: {
      id: feedback.toUser.id,
      email: feedback.toUser.email,
      name: `${feedback.toUser.firstName} ${feedback.toUser.lastName}`,
      role: feedback.toUser.role,
    },
    vendor: feedback.vendor
      ? { id: feedback.vendor.id, businessName: feedback.vendor.businessName }
      : null,
    booking: {
      id: feedback.booking.id,
      eventDate: feedback.booking.eventDate,
      status: feedback.booking.status,
    },
  }));

  res.status(200).json({
    message: "Ratings retrieved successfully",
    summary: {
      totalFeedback,
      averageRating,
      clientStats: formattedClientStats,
    },
    feedbacks: formattedFeedbacks,
  });
});

// Get feedback in frontend format
const getFeedback = asyncHandler(async (req, res) => {
  const feedbacks = await prisma.feedback.findMany({
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedFeedbacks = feedbacks.map(feedback => ({
    id: feedback.id,
    userName: `${feedback.fromUser.firstName} ${feedback.fromUser.lastName}`,
    rating: feedback.rating,
    comment: feedback.comment,
    date: feedback.createdAt,
  }));

  res.status(200).json(formattedFeedbacks);
});

// Get single feedback by ID
const getFeedbackById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!feedback) {
    res.status(404);
    throw new Error('Feedback not found');
  }

  const formattedFeedback = {
    id: feedback.id,
    userName: `${feedback.fromUser.firstName} ${feedback.fromUser.lastName}`,
    rating: feedback.rating,
    comment: feedback.comment,
    date: feedback.createdAt,
  };

  res.status(200).json(formattedFeedback);
});

module.exports = {
  reviewComplaints,
  reviewRatings,
  getFeedback,
  getFeedbackById,
};
