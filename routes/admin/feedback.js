const express = require("express");
const router = express.Router();
const {
  reviewComplaints,
  reviewRatings,
  getFeedback,
  getFeedbackById,
} = require("../../controllers/admin/feedback");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole(["ADMIN", "EVENT_PLANNER"]));

// Get all feedback
router.get("/", getFeedback);

// Get feedback by ID
router.get("/:id", getFeedbackById);

// Review complaints
router.get("/complaints", reviewComplaints);

// Review ratings
router.get("/ratings", reviewRatings);

module.exports = router;
