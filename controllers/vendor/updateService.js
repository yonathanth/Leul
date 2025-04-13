const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

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

module.exports = {
  updateService,
};