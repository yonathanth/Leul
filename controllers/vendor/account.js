const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

const editVendorAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, phone, businessName } = req.body;

  // Validate input
  if (!email && !firstName && !lastName && !phone && !businessName) {
    res.status(400);
    throw new Error(
      "At least one field (email, firstName, lastName, phone, businessName) must be provided to update"
    );
  }

  // Update password if provided
  const { password } = req.body;
  const updateData = {};
  if (password) {
    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Prepare update data
  if (email) updateData.email = email;
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phone) updateData.phone = phone;
  if (businessName) updateData.businessName = businessName;

  // Update vendor details
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    message: "Your vendor account has been updated successfully",
    vendor: {
      id: updatedVendor.id,
      email: updatedVendor.email,
      firstName: updatedVendor.firstName,
      lastName: updatedVendor.lastName,
      phone: updatedVendor.phone,
      businessName: updatedVendor.businessName,
    },
  });
});

module.exports = {
  editVendorAccount,
};
