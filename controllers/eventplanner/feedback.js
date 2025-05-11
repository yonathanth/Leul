const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// @desc    Get all feedback
// @route   GET /api/eventplanner/feedback
// @access  Private (Event Planner only)
const getFeedback = asyncHandler(async (req, res) => {
  const {
    _start = 0,
    _end = 10,
    _sort = "createdAt",
    _order = "DESC",
    rating,
    comment_like,
  } = req.query;

  const where = {};

  // Add filters if provided
  if (rating) {
    where.rating = parseInt(rating);
  }

  if (comment_like) {
    where.comment = {
      contains: comment_like,
    };
  }

  // Count total records
  const total = await prisma.feedback.count({
    where,
  });

  // Get feedback
  const feedback = await prisma.feedback.findMany({
    where,
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
        },
      },
      toUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
        },
      },
      booking: {
        select: {
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

  // Transform the data for response
  const transformedFeedback = feedback.map((item) => ({
    id: item.id,
    rating: item.rating,
    comment: item.comment,
    createdAt: item.createdAt,
    fromUser: {
      id: item.fromUserId,
      firstName: item.fromUser.firstName,
      lastName: item.fromUser.lastName,
      avatar: item.fromUser.avatar,
      role: item.fromUser.role,
    },
    toUser: {
      id: item.toUserId,
      firstName: item.toUser.firstName,
      lastName: item.toUser.lastName,
      avatar: item.toUser.avatar,
      role: item.toUser.role,
    },
    booking: item.booking
      ? {
          id: item.bookingId,
          eventDate: item.booking.eventDate,
          serviceName: item.booking.service?.name || "Unknown Service",
        }
      : null,
  }));

  res.set("x-total-count", total.toString());
  res.set("Access-Control-Expose-Headers", "x-total-count");
  res.status(200).json(transformedFeedback);
});

// @desc    Get feedback stats
// @route   GET /api/eventplanner/feedback/stats
// @access  Private (Event Planner only)
const getFeedbackStats = asyncHandler(async (req, res) => {
  // Get feedback counts by rating
  const ratingStats = await prisma.$queryRaw`
    SELECT rating, COUNT(*) as count
    FROM Feedback
    GROUP BY rating
    ORDER BY rating
  `;

  // Get average rating by vendor
  const vendorRatings = await prisma.$queryRaw`
    SELECT 
      v.businessName, 
      AVG(f.rating) as averageRating,
      COUNT(f.id) as reviewCount
    FROM Feedback f
    JOIN Vendor v ON f.vendorId = v.id
    GROUP BY v.id, v.businessName
    ORDER BY averageRating DESC
    LIMIT 10
  `;

  // Get recent feedback
  const recentFeedback = await prisma.feedback.findMany({
    include: {
      fromUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      toUser: {
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  res.status(200).json({
    ratingStats,
    vendorRatings,
    recentFeedback,
  });
});

module.exports = {
  getFeedback,
  getFeedbackStats,
};
