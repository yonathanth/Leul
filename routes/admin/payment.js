const express = require("express");
const router = express.Router();
const {
  getPaymentInsights,
  getPaymentReport,
} = require("../../controllers/admin/payment");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Payment Insights for Admin Dashboard
router.get("/insights", getPaymentInsights);

// Detailed Payment Report with Filters
router.get("/report", getPaymentReport);

module.exports = router;
