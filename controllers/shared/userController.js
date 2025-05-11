const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

/**
 * Get user profile information
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    profile: user,
  });
});

/**
 * Update user profile information
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, phone, password } = req.body;

  // Only allow users to update their own profile unless they're an admin
  if (req.user.id !== id && req.user.role !== "ADMIN") {
    res.status(403);
    throw new Error("You are not authorized to update this user");
  }

  // Validate input
  if (!email && !firstName && !lastName && !phone && !password) {
    res.status(400);
    throw new Error(
      "At least one field (email, firstName, lastName, phone, password) must be provided to update"
    );
  }

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(400);
    throw new Error("User not found");
  }

  // Prepare update data
  const updateData = {};

  // Update password if provided
  if (password) {
    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  // Add other fields to updateData if provided
  if (email) updateData.email = email;
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phone) updateData.phone = phone;

  // Update user details
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    message: "Your account has been updated successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
    },
  });
});

module.exports = {
  getProfile,
  updateUser,
};
