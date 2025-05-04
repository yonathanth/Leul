const express = require("express");
const router = express.Router();
const {
  getVendorBookings,
  getBookingById,
  confirmBooking,
  cancelBooking,
  completeBooking,
} = require("../../controllers/vendor/bookings");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access this route
router.use(checkRole(["VENDOR"]));

// Get all bookings for vendor (with optional status filter)
router.get("/", getVendorBookings);

// Get a single booking by ID
router.get("/:bookingId", getBookingById);

// Confirm a booking
router.patch("/:bookingId/confirm", confirmBooking);

// Cancel a booking
router.patch("/:bookingId/cancel", cancelBooking);

// Mark a booking as completed
router.patch("/:bookingId/complete", completeBooking);

module.exports = router;
