const express = require("express");
const router = express.Router();
const {
  editAccount,
  getProfile,
} = require("../../controllers/eventplanner/account");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only EVENT_PLANNER can access these routes
router.use(checkRole("EVENT_PLANNER"));

router.get("/profile", getProfile); // Get event planner profile
router.patch("/:id", editAccount); // Edit account details

module.exports = router;
