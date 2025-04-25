const express = require("express");
const router = express.Router();
const { getPayments } = require("../../controllers/vendor/payment");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access this route
router.use(checkRole(["VENDOR"]));

// Get vendor payment status
router.get("/", getPayments);

module.exports = router;
