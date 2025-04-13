const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

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
  const vendors = await prisma.vendor.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
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
  });

  // Format response
  const vendorListings = vendors.map((vendor) => ({
    id: vendor.id,
    businessName: vendor.businessName,
    email: vendor.user.email,
    firstName: vendor.user.firstName,
    lastName: vendor.user.lastName,
    serviceType: vendor.serviceType,
    status: vendor.status,
    rating: vendor.rating,
    services: vendor.services,
  }));

  res.status(200).json(vendorListings);
});

module.exports = {
  approveVendor,
  suspendVendor,
  viewVendorListings,
};
