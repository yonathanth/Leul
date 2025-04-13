const express = require("express");
const router = express.Router();
const { getDashboardOverview } = require("../../controllers/vendor/dashboard");
const checkRole = require("../../../middleware/authMiddleware");

// Protect routes and ensure the user is a VENDOR
router.use(checkRole("VENDOR"));

// Vendor Dashboard Overview
router.get("/dashboard-overview", getDashboardOverview);

module.exports = router;