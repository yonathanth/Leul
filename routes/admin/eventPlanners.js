const express = require("express");
const router = express.Router();
const {
  removeEventPlanner,
  editEventPlanner,
} = require("../../controllers/admin/eventPlanners");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Remove Event Planner
router.delete("/:id", removeEventPlanner);

router.patch("/:id", editEventPlanner);

module.exports = router;
