const express = require("express");
const router = express.Router();
const {
  bookEvent,
  viewBookings,
} = require("../../controllers/client/bookings");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access these routes
router.use(checkRole("CLIENT"));

// Book Event
router.post("/", bookEvent);

// View Upcoming and Past Bookings
router.get("/", viewBookings);

module.exports = router;
