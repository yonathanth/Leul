const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// @desc    Get all vendors
// @route   GET /api/eventplanner/vendors
// @access  Private (Event Planner only)
const getVendors = asyncHandler(async (req, res) => {
  const {
    _start = 0,
    _end = 10,
    _sort = "createdAt",
    _order = "DESC",
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

  // Get vendors - Modify the orderBy to handle the case when _sort is createdAt
  const orderByField =
    _sort === "createdAt"
      ? { user: { createdAt: _order.toLowerCase() } }
      : { [_sort]: _order.toLowerCase() };

  // Get vendors
  const vendors = await prisma.vendor.findMany({
    where: filters,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true,
          isBlocked: true,
          isReported: true,
        },
      },
      services: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
      feedbacks: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: orderByField,
    skip: Number(_start),
    take: Number(_end) - Number(_start),
  });

  // Transform data to include calculated fields
  const transformedVendors = vendors.map((vendor) => {
    // Calculate average rating
    let avgRating = 0;
    if (vendor.feedbacks.length > 0) {
      avgRating =
        vendor.feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) /
        vendor.feedbacks.length;
    }

    // Calculate service count
    const serviceCount = vendor.services.length;

    // Calculate price range
    let minPrice = 0;
    let maxPrice = 0;
    if (serviceCount > 0) {
      const prices = vendor.services.map((service) => service.price);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    return {
      id: vendor.id,
      businessName: vendor.businessName,
      description: vendor.description,
      serviceType: vendor.serviceType,
      status: vendor.status,
      rating: avgRating.toFixed(1),
      serviceCount,
      priceRange:
        serviceCount > 0 ? `$${minPrice} - $${maxPrice}` : "No services",
      firstName: vendor.user.firstName,
      lastName: vendor.user.lastName,
      email: vendor.user.email,
      phone: vendor.user.phone,
      avatar: vendor.user.avatar,
      createdAt: vendor.user.createdAt,
      isBlocked: vendor.user.isBlocked,
      isReported: vendor.user.isReported,
      userId: vendor.userId,
    };
  });

  res.set("x-total-count", total.toString());
  res.set("Access-Control-Expose-Headers", "x-total-count");
  res.status(200).json(transformedVendors);
});

// @desc    Get vendor by ID
// @route   GET /api/eventplanner/vendors/:id
// @access  Private (Event Planner only)
const getVendorById = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;

  const vendor = await prisma.vendor.findUnique({
    where: {
      id: vendorId,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true,
          isBlocked: true,
          isReported: true,
        },
      },
      services: true,
      feedbacks: {
        include: {
          fromUser: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Calculate average rating
  let avgRating = 0;
  if (vendor.feedbacks.length > 0) {
    avgRating =
      vendor.feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) /
      vendor.feedbacks.length;
  }

  // Format vendor data for React Admin data provider
  const vendorData = {
    ...vendor,
    id: vendor.id, // Ensure id is at the root level
    averageRating: avgRating.toFixed(1),
  };

  // Return data in the format expected by React Admin: { data: { id: ..., ... } }
  res.status(200).json({ data: vendorData });
});

// @desc    Update vendor status
// @route   PATCH /api/eventplanner/vendors/:id/status
// @access  Private (Event Planner only)
const updateVendorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ["PENDING_APPROVAL", "APPROVED", "SUSPENDED"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  // Update vendor status
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: { status },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    message: `Vendor status updated to ${status}`,
    vendor: updatedVendor,
  });
});

// @desc    Block/Unblock vendor
// @route   PATCH /api/eventplanner/vendors/:id/block
// @access  Private (Event Planner only)
const toggleVendorBlock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { blocked } = req.body;

  if (typeof blocked !== "boolean") {
    res.status(400);
    throw new Error("The 'blocked' field is required and must be a boolean");
  }

  // Find vendor to get the userId
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Update the user's isBlocked status
  const updatedUser = await prisma.user.update({
    where: { id: vendor.userId },
    data: { isBlocked: blocked },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isBlocked: true,
    },
  });

  res.status(200).json({
    message: blocked
      ? "Vendor has been blocked successfully"
      : "Vendor has been unblocked successfully",
    user: updatedUser,
  });
});

// @desc    Report vendor
// @route   PATCH /api/eventplanner/vendors/:id/report
// @access  Private (Event Planner only)
const reportVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error("Reason for reporting is required");
  }

  // Find vendor to get the userId
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }

  // Update the user's isReported status
  const updatedUser = await prisma.user.update({
    where: { id: vendor.userId },
    data: { isReported: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isReported: true,
    },
  });

  // In a real app, you might want to store the report reason in a separate reports table
  // For now, we'll just log it and update the status
  console.log(`Vendor ${id} reported for: ${reason}`);

  res.status(200).json({
    message: "Vendor has been reported successfully",
    user: updatedUser,
  });
});

// @desc    Update vendor information
// @route   PATCH /api/eventplanner/vendors/:id
// @access  Private (Event Planner only)
const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { businessName, description, serviceType } = req.body;

  // Prepare the update data for the vendor
  const vendorUpdateData = {};
  if (businessName) vendorUpdateData.businessName = businessName;
  if (description) vendorUpdateData.description = description;
  if (serviceType) vendorUpdateData.serviceType = serviceType;

  if (Object.keys(vendorUpdateData).length === 0) {
    res.status(400);
    throw new Error("No valid fields provided for update");
  }

  // Update the vendor
  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: vendorUpdateData,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Vendor information updated successfully",
    vendor: updatedVendor,
  });
});

module.exports = {
  getVendors,
  getVendorById,
  updateVendorStatus,
  toggleVendorBlock,
  reportVendor,
  updateVendor,
};
