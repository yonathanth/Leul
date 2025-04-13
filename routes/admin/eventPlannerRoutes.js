const express = require("express");
const router = express.Router();
const {
  addEventPlanner,
  removeEventPlanner,
  viewPerformance,
} = require("../../controllers/admin/eventPlanners");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Add Event Planner
router.post("/", addEventPlanner);

// Remove Event Planner
router.delete("/:id", removeEventPlanner);

// View Event Planner Performance
router.get("/performance", viewPerformance);

module.exports = router;
