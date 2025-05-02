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

// Delete an existing service listing for the vendor
const deleteService = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;
  const { serviceId } = req.params;

  // Check if the service exists and belongs to the vendor
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  if (service.vendorId !== vendorId) {
    res.status(403);
    throw new Error("Not authorized to delete this service");
  }

  // Delete the service
  await prisma.service.delete({
    where: { id: serviceId },
  });

  // Respond with a success message
  res.status(200).json({
    success: true,
    message: "Service listing deleted successfully",
  });
});

// Update an existing service listing for the vendor
const updateService = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;
  const { serviceId } = req.params;

  // Check if the service exists and belongs to the vendor
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  if (service.vendorId !== vendorId) {
    res.status(403);
    throw new Error("Not authorized to update this service");
  }

  // Extract fields to update from the request body
  const { title, description, price, category } = req.body;

  // Validate fields if provided
  if (price && (typeof price !== "number" || price <= 0)) {
    res.status(400);
    throw new Error("Price must be a positive number");
  }

  // Prepare the data to update
  const updateData = {};
  if (title) updateData.name = title;
  if (description) updateData.description = description;
  if (price) updateData.price = price;
  if (category) updateData.category = category;

  // Update the service
  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: updateData,
  });

  // Respond with the updated service
  res.status(200).json({
    success: true,
    data: {
      serviceId: updatedService.id,
      title: updatedService.name,
      description: updatedService.description,
      price: updatedService.price,
      category: updatedService.category,
      availability: {}, // Placeholder; can fetch from Availability model if needed
      updatedAt: updatedService.updatedAt,
    },
  });
});

const getVendorServices = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;

  // Get all services for this vendor
  const services = await prisma.service.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" }, // Newest first
    include: {
      vendor: {
        // Include basic vendor info if needed
        select: {
          businessName: true,
          serviceType: true,
        },
      },
      // Include other relations that exist in your Service model
      // For example, if you have bookings:
      bookings: true,
    },
  });

  // Format the response
  const formattedServices = services.map((service) => ({
    serviceId: service.id,
    title: service.name,
    description: service.description,
    price: service.price,
    category: service.category,
    vendorInfo: {
      // Include vendor info in response
      businessName: service.vendor.businessName,
      serviceType: service.vendor.serviceType,
    },
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    // Include bookings if they exist
    bookings: service.bookings || [],
  }));

  res.status(200).json({
    success: true,
    count: services.length,
    data: formattedServices,
  });
});

module.exports = {
  addService,
  deleteService,
  updateService,
  getVendorServices,
};
