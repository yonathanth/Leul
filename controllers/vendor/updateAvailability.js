const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Update the vendor's availability calendar
const updateAvailability = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;

  // Extract availability updates from the request body
  const { availability } = req.body;

  // Validate the availability array
  if (!Array.isArray(availability) || availability.length === 0) {
    res.status(400);
    throw new Error("Availability must be a non-empty array");
  }

  // Validate each availability entry
  const validStatuses = ["available", "unavailable"];
  for (const entry of availability) {
    const { date, status } = entry;

    if (!date || !status) {
      res.status(400);
      throw new Error("Each availability entry must include date and status");
    }

    // Validate date format
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400);
      throw new Error(`Invalid date format for date: ${date}`);
    }

    // Validate status
    if (!validStatuses.includes(status.toLowerCase())) {
      res.status(400);
      throw new Error(`Invalid status: ${status}. Must be 'available' or 'unavailable'`);
    }
  }

  // Process the updates (upsert: update if exists, create if not)
  const updatedAvailability = [];
  for (const entry of availability) {
    const { date, status } = entry;
    const parsedDate = new Date(date);

    const availabilityRecord = await prisma.availability.upsert({
      where: {
        vendorId_date: {
          vendorId,
          date: parsedDate,
        },
      },
      update: {
        isAvailable: status.toLowerCase() === "available",
      },
      create: {
        vendorId,
        date: parsedDate,
        isAvailable: status.toLowerCase() === "available",
      },
    });

    updatedAvailability.push({
      date: availabilityRecord.date.toISOString().split("T")[0],
      status: availabilityRecord.isAvailable ? "available" : "unavailable",
    });
  }

  // Respond with the updated availability data
  res.status(200).json({
    success: true,
    data: {
      vendorId,
      updatedAvailability,
      updatedAt: new Date().toISOString(),
    },
  });
});

module.exports = {
  updateAvailability,
};