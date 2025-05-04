const express = require("express");
const router = express.Router();
const { getDashboardData } = require("../../controllers/client/dashboard");
const { checkRole } = require("../../middleware/authMiddleware");

// Get dashboard data
router.get("/", checkRole(["CLIENT"]), getDashboardData);

module.exports = router;
