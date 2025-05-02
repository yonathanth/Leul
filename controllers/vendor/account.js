const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

const editVendorAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    email,
    firstName,
    lastName,
    phone,
    avatar,
    businessName,
    description,
    serviceType,
    password,
  } = req.body;

  // Validate input
  if (
    !email &&
    !firstName &&
    !lastName &&
    !phone &&
    !avatar &&
    !businessName &&
    !description &&
    !serviceType &&
    !password
  ) {
    res.status(400);
    throw new Error("At least one field must be provided to update");
  }

  // Check if vendor exists and include user relation
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Check if email is being changed and if new email already exists
  if (email && email !== vendor.user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400);
      throw new Error("Email already in use by another account");
    }
  }

  // Prepare user update data
  const userUpdateData = {};
  if (email) userUpdateData.email = email;
  if (firstName) userUpdateData.firstName = firstName;
  if (lastName) userUpdateData.lastName = lastName;
  if (phone) userUpdateData.phone = phone;
  if (avatar) userUpdateData.avatar = avatar;
  if (password) {
    if (password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }
    userUpdateData.password = await bcrypt.hash(password, 10);
  }

  // Prepare vendor update data
  const vendorUpdateData = {};
  if (businessName) vendorUpdateData.businessName = businessName;
  if (description) vendorUpdateData.description = description;
  if (serviceType) vendorUpdateData.serviceType = serviceType;

  // Update records
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...vendorUpdateData,
      ...(Object.keys(userUpdateData).length > 0 && {
        user: {
          update: userUpdateData,
        },
      }),
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
        },
      },
    },
  });

  // Prepare response
  const responseData = {
    id: updatedVendor.id,
    businessName: updatedVendor.businessName,
    description: updatedVendor.description,
    serviceType: updatedVendor.serviceType,
    user: {
      email: updatedVendor.user.email,
      firstName: updatedVendor.user.firstName,
      lastName: updatedVendor.user.lastName,
      phone: updatedVendor.user.phone,
      avatar: updatedVendor.user.avatar,
    },
  };

  res.status(200).json({
    message: "Vendor account updated successfully",
    vendor: responseData,
  });
});

module.exports = {
  editVendorAccount,
};
