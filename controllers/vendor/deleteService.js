const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

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

module.exports = {
  deleteService,
};