const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const { createVendorSubaccount } = require("../../utils/chapa");

// Approve Vendor
const approveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Check if vendor is already approved
  if (vendor.status === "APPROVED") {
    res.status(400);
    throw new Error("Vendor is already approved");
  }

  // Create Chapa subaccount for vendor
  try {
    await createVendorSubaccount(id);
  } catch (error) {
    console.error("Chapa Subaccount Creation Error:", error.message);
    res.status(500);
    throw new Error(
      `Failed to create vendor payment account: ${error.message}`
    );
  }

  // Update vendor status to APPROVED
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: { status: "APPROVED" },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  res.status(200).json({
    message: "Vendor approved successfully",
    vendor: {
      id: updatedVendor.id,
      businessName: updatedVendor.businessName,
      email: updatedVendor.user.email,
      firstName: updatedVendor.user.firstName,
      lastName: updatedVendor.user.lastName,
      status: updatedVendor.status,
    },
  });
});

const deleteVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Delete associated user (this will cascade to vendor due to schema relations)
  await prisma.user.delete({ where: { id: vendor.userId } });

  res.status(200).json({ message: "Vendor removed successfully" });
});

const editVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { businessName, serviceType, isActive, isBlocked, name, email, phone } =
    req.body;

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Prepare update data for vendor
  const vendorUpdateData = {};
  if (businessName) vendorUpdateData.businessName = businessName;
  if (serviceType) vendorUpdateData.serviceType = serviceType;
  if (isActive !== undefined) {
    vendorUpdateData.status = isActive ? "APPROVED" : "SUSPENDED";
  }

  // Prepare update data for user
  const userUpdateData = {};
  if (email) userUpdateData.email = email;
  if (isBlocked !== undefined) userUpdateData.isBlocked = isBlocked;
  if (phone) userUpdateData.phone = phone;

  // Handle name if provided
  if (name) {
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");
    userUpdateData.firstName = firstName;
    userUpdateData.lastName = lastName;
  }

  // Update vendor and user details
  const [updatedVendor, updatedUser] = await Promise.all([
    prisma.vendor.update({
      where: { id },
      data: vendorUpdateData,
    }),
    prisma.user.update({
      where: { id: vendor.userId },
      data: userUpdateData,
    }),
  ]);

  res.status(200).json({
    id: updatedVendor.id,
    businessName: updatedVendor.businessName,
    serviceType: updatedVendor.serviceType,
    isActive: updatedVendor.status === "APPROVED",
    email: updatedUser.email,
    name: `${updatedUser.firstName} ${updatedUser.lastName}`,
    phone: updatedUser.phone,
    isBlocked: updatedUser.isBlocked,
    avatar: updatedUser.avatar,
  });
});

// Suspend Vendor
const suspendVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Check if vendor is already suspended
  if (vendor.status === "SUSPENDED") {
    res.status(400);
    throw new Error("Vendor is already suspended");
  }

  // Update vendor status to SUSPENDED
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: { status: "SUSPENDED" },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  res.status(200).json({
    message: "Vendor suspended successfully",
    vendor: {
      id: updatedVendor.id,
      businessName: updatedVendor.businessName,
      email: updatedVendor.user.email,
      firstName: updatedVendor.user.firstName,
      lastName: updatedVendor.user.lastName,
      status: updatedVendor.status,
    },
  });
});

// View Vendor Listings
const viewVendorListings = asyncHandler(async (req, res) => {
  const {
    _start = 0,
    _end = 10,
    _sort = "businessName",
    _order = "ASC",
    businessName_like,
    serviceType_like,
    status,
  } = req.query;

  const filters = {};

  // Add filters if provided
  if (businessName_like) {
    filters.businessName = {
      contains: businessName_like,
    };
  }

  if (serviceType_like) {
    filters.serviceType = {
      contains: serviceType_like,
    };
  }

  if (status) {
    filters.status = status;
  }

  // Count total records
  const total = await prisma.vendor.count({
    where: filters,
  });

  // Check if _sort is a field that needs special handling
  let orderByField;
  if (_sort === "name") {
    // Sort by user's first name
    orderByField = {
      user: { firstName: _order.toLowerCase() },
    };
  } else if (_sort === "email") {
    // Sort by user's email
    orderByField = {
      user: { email: _order.toLowerCase() },
    };
  } else if (_sort === "createdAt") {
    // Sort by user's createdAt
    orderByField = {
      user: { createdAt: _order.toLowerCase() },
    };
  } else {
    // Sort by vendor fields
    orderByField = {
      [_sort]: _order.toLowerCase(),
    };
  }

  // Get vendors with pagination
  const vendors = await prisma.vendor.findMany({
    where: filters,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isBlocked: true,
          createdAt: true,
        },
      },
      services: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
        },
      },
    },
    orderBy: orderByField,
    skip: Number(_start),
    take: Number(_end) - Number(_start),
  });

  // Format response
  const vendorListings = vendors.map((vendor) => ({
    id: vendor.id,
    userId: vendor.userId,
    businessName: vendor.businessName,
    email: vendor.user.email,
    name: `${vendor.user.firstName} ${vendor.user.lastName}`,
    phone: vendor.user.phone,
    serviceType: vendor.serviceType,
    status: vendor.status,
    isActive: vendor.status === "APPROVED",
    rating: vendor.rating,
    serviceCount: vendor.services.length,
    isBlocked: vendor.user.isBlocked,
    createdAt: vendor.user.createdAt,
  }));

  // Set headers for react-admin pagination
  res.set("x-total-count", total.toString());
  res.set("Access-Control-Expose-Headers", "x-total-count");
  res.status(200).json(vendorListings);
});

// Get vendor by ID
const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find vendor with user details
  const vendor = await prisma.vendor.findUnique({
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

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Format the response
  const formattedVendor = {
    id: vendor.id,
    businessName: vendor.businessName,
    serviceType: vendor.serviceType,
    status: vendor.status,
    email: vendor.user.email,
    name: `${vendor.user.firstName} ${vendor.user.lastName}`,
    phone: vendor.user.phone,
    avatar: vendor.user.avatar,
    isBlocked: vendor.user.isBlocked,
    createdAt: vendor.user.createdAt,
  };

  res.status(200).json(formattedVendor);
});

module.exports = {
  editVendor,
  deleteVendor,
  approveVendor,
  suspendVendor,
  viewVendorListings,
  getVendorById,
};
