const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

const editAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, phone, password } = req.body;

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

  // Update client details
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

// Get User Profile
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user with client profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: true,
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Get statistics
  const bookingStats = await prisma.booking.groupBy({
    by: ["status"],
    where: {
      clientId: user.clientProfile.id,
    },
    _count: {
      _all: true,
    },
  });

  const totalBookings = bookingStats.reduce(
    (sum, stat) => sum + stat._count._all,
    0
  );

  // Format the booking stats into an object
  const bookingCounts = {};
  bookingStats.forEach((stat) => {
    bookingCounts[stat.status] = stat._count._all;
  });

  // Get payment statistics
  const paymentStats = await prisma.payment.aggregate({
    where: {
      userId,
      status: "COMPLETED",
    },
    _count: {
      _all: true,
    },
    _sum: {
      amount: true,
    },
  });

  // Format response
  res.status(200).json({
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || null,
      avatar: user.avatar || null,
      role: user.role,
      createdAt: user.createdAt,
    },
    stats: {
      totalBookings,
      bookings: bookingCounts,
      payments: {
        count: paymentStats._count._all,
        totalAmount: paymentStats._sum.amount || 0,
      },
    },
  });
});

module.exports = {
  editAccount,
  getProfile,
};
