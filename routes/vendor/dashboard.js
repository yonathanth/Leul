const express = require("express");
const router = express.Router();
const { getDashboardOverview } = require("../../controllers/vendor/dashboard");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access this route
router.use(checkRole(["VENDOR"]));

// Get vendor dashboard overview
router.get("/overview", getDashboardOverview);

module.exports = router;
