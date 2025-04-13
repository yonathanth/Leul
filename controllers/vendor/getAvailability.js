const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Get the vendor's availability calendar
const getAvailability = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;

  // Extract query parameters for filtering dates
  const { startDate, endDate } = req.query;

  // Build the query filter
  const dateFilter = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date format
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400);
      throw new Error("Invalid date format for startDate or endDate");
    }

    if (start >= end) {
      res.status(400);
      throw new Error("startDate must be before endDate");
    }

    dateFilter.date = {
      gte: start,
      lte: end,
    };
  }

  // Fetch the vendor's availability records
  const availabilityRecords = await prisma.availability.findMany({
    where: {
      vendorId,
      ...dateFilter,
    },
    select: {
      date: true,
      isAvailable: true,
    },
  });

  // Format the availability data
  const availability = availabilityRecords.map((record) => ({
    date: record.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
    status: record.isAvailable ? "available" : "unavailable",
  }));

  // Respond with the availability data
  res.status(200).json({
    success: true,
    data: {
      vendorId,
      availability,
    },
  });
});

module.exports = {
  getAvailability,
};