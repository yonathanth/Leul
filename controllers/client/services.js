const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Browse Services
const browseServices = asyncHandler(async (req, res) => {
  // Extract query parameters for filtering, sorting, and pagination
  const {
    category,
    search,
    sortBy = "basePrice", // Changed from price to basePrice
    sortOrder = "asc", // Default to ascending
    page = 1,
    limit = 10,
  } = req.query;

  // Validate sort parameters
  const validSortFields = ["basePrice", "name", "createdAt"]; // Updated from price to basePrice
  const validSortOrders = ["asc", "desc"];
  if (!validSortFields.includes(sortBy)) {
    res.status(400);
    throw new Error(
      "Invalid sortBy field. Must be basePrice, name, or createdAt"
    );
  }
  if (!validSortOrders.includes(sortOrder)) {
    res.status(400);
    throw new Error("Invalid sortOrder. Must be asc or desc");
  }

  // Convert page and limit to integers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  if (pageNum < 1 || limitNum < 1) {
    res.status(400);
    throw new Error("Page and limit must be positive integers");
  }

  // Build where clause for filtering
  const where = {
    vendor: { status: "APPROVED" }, // Only show services from approved vendors
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" }; // Case-insensitive search
  }

  // Fetch services with pagination
  const services = await prisma.service.findMany({
    where,
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          rating: true,
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      tiers: true, // Include service tiers
    },
    orderBy: { [sortBy]: sortOrder },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });

  // Get total count for pagination metadata
  const totalServices = await prisma.service.count({ where });

  // Format response
  const formattedServices = services.map((service) => ({
    id: service.id,
    name: service.name || "",
    description: service.description || "",
    basePrice: service.basePrice || 0,
    category: service.category || "",
    tiers: service.tiers || [],
    createdAt: service.createdAt,
    vendor: service.vendor
      ? {
          id: service.vendor.id,
          userId: service.vendor.userId,
          businessName: service.vendor.businessName || "",
          rating: service.vendor.rating || 0,
          ownerName: service.vendor.user
            ? `${service.vendor.user.firstName || ""} ${
                service.vendor.user.lastName || ""
              }`.trim()
            : "",
        }
      : null,
  }));

  res.status(200).json({
    message: "Services retrieved successfully",
    services: formattedServices,
    pagination: {
      total: totalServices,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalServices / limitNum),
    },
  });
});

module.exports = { browseServices };
