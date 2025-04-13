const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Browse Services
const browseServices = asyncHandler(async (req, res) => {
  // Extract query parameters for filtering, sorting, and pagination
  const {
    category,
    search,
    sortBy = "price", // Default to price
    sortOrder = "asc", // Default to ascending
    page = 1,
    limit = 10,
  } = req.query;

  // Validate sort parameters
  const validSortFields = ["price", "name", "createdAt"];
  const validSortOrders = ["asc", "desc"];
  if (!validSortFields.includes(sortBy)) {
    res.status(400);
    throw new Error("Invalid sortBy field. Must be price, name, or createdAt");
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
          user: { select: { firstName: true, lastName: true } },
        },
      },
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
    name: service.name,
    description: service.description,
    price: service.price,
    category: service.category,
    createdAt: service.createdAt,
    vendor: {
      id: service.vendor.id,
      businessName: service.vendor.businessName,
      rating: service.vendor.rating,
      ownerName: `${service.vendor.user.firstName} ${service.vendor.user.lastName}`,
    },
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
