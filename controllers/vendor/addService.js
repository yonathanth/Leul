const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Add a new service listing for the vendor
const addService = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;

  // Extract service details from the request body
  const { title, description, price, category, availability } = req.body;

  // Validate required fields
  if (!title || !price || !category) {
    res.status(400);
    throw new Error("Title, price, and category are required fields");
  }

  // Validate price (must be a positive number)
  if (typeof price !== "number" || price <= 0) {
    res.status(400);
    throw new Error("Price must be a positive number");
  }

  // Validate availability (if provided)
  let availabilityData = {};
  if (availability) {
    const { startDate, endDate } = availability;
    if (!startDate || !endDate) {
      res.status(400);
      throw new Error("Availability must include startDate and endDate");
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400);
      throw new Error("Invalid date format for startDate or endDate");
    }

    if (start >= end) {
      res.status(400);
      throw new Error("startDate must be before endDate");
    }

    availabilityData = { startDate, endDate };
  }

  // Create the new service
  const newService = await prisma.service.create({
    data: {
      name: title,
      description: description || "",
      price,
      category,
      vendorId,
    },
  });

  // Respond with the created service
  res.status(201).json({
    success: true,
    data: {
      serviceId: newService.id,
      title: newService.name,
      description: newService.description,
      price: newService.price,
      category: newService.category,
      availability: availabilityData,
      createdAt: newService.createdAt,
    },
  });
});

module.exports = {
  addService,
};