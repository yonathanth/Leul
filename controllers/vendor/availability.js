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
      throw new Error(
        `Invalid status: ${status}. Must be 'available' or 'unavailable'`
      );
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

// Confirm (accept/decline) an event assignment for the vendor
const confirmEventAssignment = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;
  const { assignmentId } = req.params;
  const { status } = req.body;

  // Validate the status field
  const validStatuses = ["ACCEPTED", "DECLINED"];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    res.status(400);
    throw new Error("Invalid status. Use 'accepted' or 'declined'.");
  }

  // Check if the assignment exists and belongs to the vendor
  const assignment = await prisma.assignedVendor.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    res.status(404);
    throw new Error("Event assignment not found");
  }

  if (assignment.vendorId !== vendorId) {
    res.status(403);
    throw new Error("Not authorized to confirm this event assignment");
  }

  // Check if the assignment is still pending
  if (assignment.status !== "PENDING") {
    res.status(400);
    throw new Error("Event assignment has already been confirmed or declined");
  }

  // Update the assignment status
  const updatedAssignment = await prisma.assignedVendor.update({
    where: { id: assignmentId },
    data: {
      status: status.toUpperCase(), // Store as "ACCEPTED" or "DECLINED"
      confirmedAt: new Date(), // Set the confirmation timestamp
    },
  });

  // Respond with the updated assignment
  res.status(200).json({
    success: true,
    data: {
      assignmentId: updatedAssignment.id,
      eventId: updatedAssignment.bookingId,
      vendorId: updatedAssignment.vendorId,
      status: updatedAssignment.status,
      updatedAt: updatedAssignment.updatedAt,
    },
  });
});

module.exports = {
  updateAvailability,
  getAvailability,
  confirmEventAssignment,
};
