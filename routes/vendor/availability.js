const express = require("express");
const router = express.Router();
const {
  updateAvailability,
  getAvailability,
  confirmEventAssignment,
} = require("../../controllers/vendor/availability");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access these routes
router.use(checkRole(["VENDOR"]));

// Update the vendor's availability calendar
router.patch("/availability", updateAvailability);

// Get the vendor's availability calendar
router.get("/availability", getAvailability);

// Confirm (accept/decline) an event assignment
router.patch("/assignments/:assignmentId/confirm", confirmEventAssignment);

module.exports = router;
