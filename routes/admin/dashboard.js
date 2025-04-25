const express = require("express");
const router = express.Router();
const { getOverview } = require("../../controllers/admin/dashboard");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access this route
router.use(checkRole(["ADMIN", "EVENT_PLANNER"]));

// Dashboard Overview
router.get("/overview", getOverview);

module.exports = router;
