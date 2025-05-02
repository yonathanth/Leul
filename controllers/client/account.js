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

module.exports = {
  editAccount,
};
