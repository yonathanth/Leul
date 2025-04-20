const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

//edit event planner details
const editEventPlanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, companyName } = req.body;

  // Validate input
  if (!email && !firstName && !lastName && !companyName) {
    res.status(400);
    throw new Error(
      "At least one field (email, firstName, lastName, companyName) must be provided to update"
    );
  }

  // Check if user exists and is an event planner
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "EVENT_PLANNER") {
    res.status(400);
    throw new Error("User is not an event planner");
  }

  // Prepare update data
  const updateData = {};
  if (email) updateData.email = email;
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (companyName) updateData.companyName = companyName;

  // Update event planner details
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    message: "Event Planner updated successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      companyName: updatedUser.companyName,
      role: updatedUser.role,
      isBlocked: updatedUser.isBlocked,
    },
  });
});

// Remove Event Planner
const removeEventPlanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if event planner exists
  const eventPlanner = await prisma.eventPlanner.findUnique({ where: { id } });
  if (!eventPlanner) {
    res.status(404);
    throw new Error("Event Planner not found");
  }

  // Delete associated user (this will cascade to event planner due to schema relations)
  await prisma.user.delete({ where: { id: eventPlanner.userId } });

  res.status(200).json({ message: "Event Planner removed successfully" });
});

// View Event Planner Performance
const viewPerformance = asyncHandler(async (req, res) => {
  const eventPlanners = await prisma.eventPlanner.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      bookings: {
        select: { id: true, status: true, eventDate: true },
      },
      _count: {
        select: { bookings: true },
      },
    },
  });

  // Calculate performance metrics
  const performance = await Promise.all(
    eventPlanners.map(async (planner) => {
      // Get feedback for bookings associated with this planner
      const feedbacks = await prisma.feedback.findMany({
        where: {
          booking: { eventPlannerId: planner.id },
        },
        select: { rating: true },
      });

      const totalFeedback = feedbacks.length;
      const averageRating =
        totalFeedback > 0
          ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
          : 0;

      return {
        id: planner.id,
        email: planner.user.email,
        firstName: planner.user.firstName,
        lastName: planner.user.lastName,
        companyName: planner.companyName,
        totalBookings: planner._count.bookings,
        completedBookings: planner.bookings.filter(
          (b) => b.status === "COMPLETED"
        ).length,
        averageRating: Number(averageRating.toFixed(2)),
        totalFeedback,
      };
    })
  );

  res.status(200).json(performance);
});

module.exports = {
  editEventPlanner,
  removeEventPlanner,
  viewPerformance,
};
