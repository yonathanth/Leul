const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
} = require("../../controllers/eventplanner/dashboard");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access these routes
router.use(checkRole("EVENT_PLANNER"));
router.get("/", getDashboardStats);

module.exports = router;
