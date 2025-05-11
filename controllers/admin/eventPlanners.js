const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

//edit event planner details
const editEventPlanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, phone, isBlocked } = req.body;

  // Check if event planner exists
  const eventPlanner = await prisma.eventPlanner.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!eventPlanner) {
    res.status(404);
    throw new Error("Event Planner not found");
  }

  // Prepare update data
  const updateData = {};

  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (isBlocked !== undefined) updateData.isBlocked = isBlocked;

  // Handle name if provided
  if (name) {
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");
    updateData.firstName = firstName;
    updateData.lastName = lastName;
  }

  // Update user details
  const updatedUser = await prisma.user.update({
    where: { id: eventPlanner.userId },
    data: updateData,
  });

  res.status(200).json({
    id: eventPlanner.id,
    email: updatedUser.email,
    name: `${updatedUser.firstName} ${updatedUser.lastName}`,
    phone: updatedUser.phone,
    avatar: updatedUser.avatar,
    isBlocked: updatedUser.isBlocked,
    createdAt: updatedUser.createdAt,
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

// Get all event planners
const getEventPlanners = asyncHandler(async (req, res) => {
  const eventPlanners = await prisma.eventPlanner.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isBlocked: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      user: {
        createdAt: "desc",
      },
    },
  });

  // Format the response
  const formattedEventPlanners = eventPlanners.map((planner) => ({
    id: planner.id,
    userId: planner.userId,
    companyName: planner.companyName,
    bio: planner.bio,
    email: planner.user.email,
    name: `${planner.user.firstName} ${planner.user.lastName}`,
    phone: planner.user.phone,
    avatar: planner.user.avatar,
    isBlocked: planner.user.isBlocked,
    createdAt: planner.user.createdAt,
  }));

  res.status(200).json(formattedEventPlanners);
});

// Get event planner by ID
const getEventPlannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find event planner with user details
  const eventPlanner = await prisma.eventPlanner.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isBlocked: true,
          createdAt: true,
        },
      },
    },
  });

  if (!eventPlanner) {
    res.status(404);
    throw new Error("Event Planner not found");
  }

  // Format the response
  const formattedEventPlanner = {
    id: eventPlanner.id,
    email: eventPlanner.user.email,
    name: `${eventPlanner.user.firstName} ${eventPlanner.user.lastName}`,
    phone: eventPlanner.user.phone,
    avatar: eventPlanner.user.avatar,
    isBlocked: eventPlanner.user.isBlocked,
    createdAt: eventPlanner.user.createdAt,
  };

  res.status(200).json(formattedEventPlanner);
});

// Create new event planner
const createEventPlanner = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      res.status(400);
      throw new Error("Email, password, and name are required");
    }

    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: name,
        lastName: "",
        phone: phone || null,
        role: "EVENT_PLANNER",
      },
    });

    // Then create event planner
    const eventPlanner = await prisma.eventPlanner.create({
      data: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isBlocked: true,
            createdAt: true,
          },
        },
      },
    });

    // Format the response
    const formattedEventPlanner = {
      id: eventPlanner.id,
      userId: eventPlanner.userId,
      email: eventPlanner.user.email,
      name: eventPlanner.user.firstName,
      phone: eventPlanner.user.phone,
      avatar: eventPlanner.user.avatar,
      isBlocked: eventPlanner.user.isBlocked,
      createdAt: eventPlanner.user.createdAt,
    };

    res.status(201).json(formattedEventPlanner);
  } catch (error) {
    console.error("Error creating event planner:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  getEventPlanners,
  createEventPlanner,
  editEventPlanner,
  removeEventPlanner,
  getEventPlannerById,
};
