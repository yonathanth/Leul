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
  const { title, description, basePrice, category, tiers } = req.body;

  // Validate required fields
  if (!title || !basePrice || !category) {
    res.status(400);
    throw new Error("Title, base price, and category are required fields");
  }

  // Validate base price (must be a positive number)
  if (typeof basePrice !== "number" || basePrice <= 0) {
    res.status(400);
    throw new Error("Base price must be a positive number");
  }

  // Validate that at least one tier is provided
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    res.status(400);
    throw new Error("At least one service tier must be provided");
  }

  // Create the new service with its tiers
  const newService = await prisma.service.create({
    data: {
      name: title,
      description: description || "",
      basePrice,
      category,
      vendorId,
      tiers: {
        create: tiers.map((tier) => ({
          tier: tier.tier,
          price: tier.price,
          description: tier.description || "",
        })),
      },
    },
    include: {
      tiers: true,
    },
  });

  // Respond with the created service
  res.status(201).json({
    success: true,
    data: {
      serviceId: newService.id,
      title: newService.name,
      description: newService.description,
      basePrice: newService.basePrice,
      category: newService.category,
      tiers: newService.tiers,
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

  // Get serviceId from route parameters
  const serviceId = req.params.serviceId;
  if (!serviceId) {
    res.status(400);
    throw new Error("Service ID is required");
  }

  console.log("Updating service with ID:", serviceId);

  // Check if the service exists and belongs to this vendor
  const existingService = await prisma.service.findFirst({
    where: {
      id: serviceId,
      vendorId: vendorId,
    },
    include: {
      tiers: true,
    },
  });

  if (!existingService) {
    res.status(404);
    throw new Error(
      "Service not found or you don't have permission to edit it"
    );
  }

  // Extract update details from the request body
  const { title, description, basePrice, category, tiers } = req.body;

  // Validate price if provided (must be a positive number)
  if (
    basePrice !== undefined &&
    (typeof basePrice !== "number" || basePrice <= 0)
  ) {
    res.status(400);
    throw new Error("Base price must be a positive number");
  }

  // Update service tiers if provided
  if (tiers && Array.isArray(tiers)) {
    // Delete existing tiers
    await prisma.serviceTierPrice.deleteMany({
      where: { serviceId },
    });

    // Create new tiers
    await Promise.all(
      tiers.map((tier) =>
        prisma.serviceTierPrice.create({
          data: {
            serviceId,
            tier: tier.tier,
            price: tier.price,
            description: tier.description || "",
          },
        })
      )
    );
  }

  // Update the service
  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: {
      name: title !== undefined ? title : existingService.name,
      description:
        description !== undefined ? description : existingService.description,
      basePrice:
        basePrice !== undefined ? basePrice : existingService.basePrice,
      category: category !== undefined ? category : existingService.category,
    },
    include: {
      tiers: true,
    },
  });

  // Respond with the updated service
  res.status(200).json({
    success: true,
    data: {
      serviceId: updatedService.id,
      title: updatedService.name,
      description: updatedService.description,
      basePrice: updatedService.basePrice,
      category: updatedService.category,
      tiers: updatedService.tiers,
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
      tiers: true, // Include service tiers
      // Include other relations that exist in your Service model
      bookings: true,
    },
  });

  // Format the response
  const formattedServices = services.map((service) => ({
    serviceId: service.id,
    title: service.name,
    description: service.description,
    basePrice: service.basePrice,
    category: service.category,
    tiers: service.tiers,
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
