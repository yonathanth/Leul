const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Book Event
const bookEvent = asyncHandler(async (req, res) => {
  const { serviceId, eventDate, location, attendees, specialRequests } =
    req.body;
  const userId = req.user.id; // Assumes user ID from auth middleware

  // Validate required fields
  if (!serviceId || !eventDate || !location) {
    res.status(400);
    throw new Error("Service ID, event date, and location are required");
  }

  // Validate service exists and is from an approved vendor
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { vendor: true },
  });

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  if (service.vendor.status !== "APPROVED") {
    res.status(400);
    throw new Error("Service is not available from an approved vendor");
  }

  // Validate event date is in the future
  const eventDateObj = new Date(eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  if (eventDateObj < today) {
    res.status(400);
    throw new Error("Event date must be in the future");
  }

  // Find client profile
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client) {
    res.status(400);
    throw new Error("Client profile not found");
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      serviceId,
      eventDate: eventDateObj,
      location,
      attendees: attendees ? parseInt(attendees) : undefined,
      specialRequests,
      status: "PENDING",
    },
    include: {
      service: {
        select: {
          name: true,
          price: true,
          category: true,
          vendor: { select: { businessName: true, rating: true, id: true } },
        },
      },
    },
  });

  // Removed payment creation code - payment will be created during payment initiation

  res.status(201).json({
    message: "Event booked successfully",
    booking: {
      id: booking.id,
      eventDate: booking.eventDate,
      location: booking.location,
      status: booking.status,
      attendees: booking.attendees,
      specialRequests: booking.specialRequests,
      service: {
        id: service.id,
        name: booking.service.name,
        price: booking.service.price,
        category: booking.service.category,
      },
      vendor: booking.service.vendor
        ? {
            businessName: booking.service.vendor.businessName,
            id: booking.service.vendor.id,
            rating: booking.service.vendor.rating,
          }
        : null,
    },
  });
});

// View Upcoming and Past Bookings
const viewBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type = "upcoming", page = 1, limit = 10 } = req.query;

  // Validate type
  if (!["upcoming", "past"].includes(type)) {
    res.status(400);
    throw new Error("Type must be 'upcoming' or 'past'");
  }

  // Convert page and limit to integers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  if (pageNum < 1 || limitNum < 1) {
    res.status(400);
    throw new Error("Page and limit must be positive integers");
  }

  // Find client profile
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client) {
    res.status(400);
    throw new Error("Client profile not found");
  }

  // Define conditions for upcoming and past bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where =
    type === "upcoming"
      ? {
          clientId: client.id,
          OR: [
            { eventDate: { gte: today } },
            { status: { in: ["PENDING", "CONFIRMED"] } },
          ],
        }
      : {
          clientId: client.id,
          OR: [
            { eventDate: { lt: today } },
            { status: { in: ["COMPLETED", "CANCELLED"] } },
          ],
        };

  // Fetch bookings with pagination
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: {
        select: {
          name: true,
          price: true,
          category: true,
          vendor: { select: { businessName: true, rating: true } },
        },
      },
    },
    orderBy: { eventDate: type === "upcoming" ? "asc" : "desc" },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
  });

  // Get total count for pagination
  const totalBookings = await prisma.booking.count({ where });

  // Format response
  const formattedBookings = bookings.map((booking) => ({
    id: booking.id,
    eventDate: booking.eventDate,
    location: booking.location,
    status: booking.status,
    attendees: booking.attendees,
    specialRequests: booking.specialRequests,
    service: {
      id: booking.service.id,
      name: booking.service.name,
      price: booking.service.price,
      category: booking.service.category,
    },
    vendor: booking.service.vendor
      ? {
          businessName: booking.service.vendor.businessName,
          rating: booking.service.vendor.rating,
        }
      : null,
  }));

  res.status(200).json({
    message: `${
      type === "upcoming" ? "Upcoming" : "Past"
    } bookings retrieved successfully`,
    bookings: formattedBookings,
    pagination: {
      total: totalBookings,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalBookings / limitNum),
    },
  });
});

module.exports = { bookEvent, viewBookings };
