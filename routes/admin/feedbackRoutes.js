const express = require("express");
const router = express.Router();
const {
  reviewComplaints,
  reviewRatings,
} = require("../../controllers/admin/feedback");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Review Complaints
router.get("/complaints", reviewComplaints);

// Review Ratings
router.get("/ratings", reviewRatings);

module.exports = router;
