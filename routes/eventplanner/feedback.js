const express = require("express");
const router = express.Router();
const {
  getFeedback,
  getFeedbackStats,
} = require("../../controllers/eventplanner/feedback");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only EVENT_PLANNER can access these routes
router.use(checkRole("EVENT_PLANNER"));

router.get("/", getFeedback);
router.get("/stats", getFeedbackStats);

module.exports = router;
