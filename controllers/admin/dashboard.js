// controllers/admin/dashboard.js
const asyncHandler = require("express-async-handler");
const prisma = require("../../../prisma/client");

// Overview stats for Admin dashboard
const getOverview = asyncHandler(async (req, res) => {
  const totalUsers = await prisma.user.count({
    where: { role: "CLIENT" },
  });
  const totalVendors = await prisma.vendor.count();
  const totalEventPlanners = await prisma.eventPlanner.count();
  const activeBookings = await prisma.booking.count({
    where: { status: { in: ["PENDING", "CONFIRMED"] } },
  });
  const totalPayments = await prisma.payment.count();
  const pendingPayments = await prisma.payment.count({
    where: { status: "PENDING" },
  });
  const totalFeedback = await prisma.feedback.count();

  res.status(200).json({
    totalUsers,
    totalVendors,
    totalEventPlanners,
    activeBookings,
    totalPayments,
    pendingPayments,
    totalFeedback,
  });
});

// Manage Event Planners
const getEventPlanners = asyncHandler(async (req, res) => {
  const eventPlanners = await prisma.eventPlanner.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      bookings: { select: { id: true, status: true } },
    },
  });
  res.status(200).json(eventPlanners);
});

const deleteEventPlanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const eventPlanner = await prisma.eventPlanner.findUnique({ where: { id } });
  if (!eventPlanner) {
    res.status(404);
    throw new Error("Event Planner not found");
  }

  // Delete associated user
  await prisma.user.delete({ where: { id: eventPlanner.userId } });
  res.status(200).json({ message: "Event Planner deleted successfully" });
});

// Manage Vendors
const getVendors = asyncHandler(async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      services: true,
    },
  });
  res.status(200).json(vendors);
});

const updateVendorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "APPROVED", "SUSPENDED", "PENDING_APPROVAL"
  const validStatuses = ["PENDING_APPROVAL", "APPROVED", "SUSPENDED"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(
      "Invalid status. Must be PENDING_APPROVAL, APPROVED, or SUSPENDED"
    );
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status },
  });
  res.status(200).json({ message: "Vendor status updated", vendor });
});

// User Management
const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });
  res.status(200).json(users);
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body; // true to block, false to unblock

  if (typeof isBlocked !== "boolean") {
    res.status(400);
    throw new Error("isBlocked must be a boolean value");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "ADMIN") {
    res.status(403);
    throw new Error("Cannot block an admin user");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isBlocked },
  });

  res.status(200).json({
    message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      isBlocked: updatedUser.isBlocked,
    },
  });
});

// Process Feedback
const getFeedback = asyncHandler(async (req, res) => {
  const feedback = await prisma.feedback.findMany({
    include: {
      fromUser: { select: { email: true, firstName: true, lastName: true } },
      toUser: { select: { email: true, firstName: true, lastName: true } },
      vendor: true,
      booking: true,
    },
  });
  res.status(200).json(feedback);
});

// Payment Tracking
const getPayments = asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      recipient: { select: { email: true, firstName: true, lastName: true } },
      booking: true,
    },
  });
  res.status(200).json(payments);
});

module.exports = {
  getOverview,
  getEventPlanners,
  deleteEventPlanner,
  getVendors,
  updateVendorStatus,
  getUsers,
  blockUser,
  getFeedback,
  getPayments,
};
