const express = require("express");
const router = express.Router();
const {
  getEventPlanners,
  createEventPlanner,
  removeEventPlanner,
  editEventPlanner,
  getEventPlannerById,
} = require("../../controllers/admin/eventPlanners");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Get all event planners
router.get("/", getEventPlanners);

// Get event planner by ID
router.get("/:id", getEventPlannerById);

// Create new event planner
router.post("/", createEventPlanner);

// Remove Event Planner
router.delete("/:id", removeEventPlanner);

// Edit Event Planner
router.patch("/:id", editEventPlanner);

module.exports = router;
