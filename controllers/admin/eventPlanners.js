const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

//edit event planner details
const editEventPlanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName } = req.body;

  // Validate input
  if (!email && !firstName && !lastName) {
    res.status(400);
    throw new Error(
      "At least one field (email, firstName, lastName) must be provided to update"
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

module.exports = {
  editEventPlanner,
  removeEventPlanner,
};
