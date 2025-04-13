const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

// Add Event Planner
const addEventPlanner = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, companyName, bio } =
    req.body;

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    res.status(400);
    throw new Error("Email, password, first name, and last name are required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user with EVENT_PLANNER role
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: "EVENT_PLANNER",
    },
  });

  // Create event planner profile
  const eventPlanner = await prisma.eventPlanner.create({
    data: {
      userId: user.id,
      companyName,
      bio,
    },
  });

  res.status(201).json({
    message: "Event Planner created successfully",
    eventPlanner: {
      id: eventPlanner.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: eventPlanner.companyName,
      bio: eventPlanner.bio,
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
  addEventPlanner,
  removeEventPlanner,
  viewPerformance,
};
