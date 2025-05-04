const express = require("express");
const router = express.Router();
const {
  getPaymentInsights,
  getPaymentReport,
  getPayments,
} = require("../../controllers/admin/payment");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Payment Insights for Admin Dashboard
router.get("/insights", getPaymentInsights);

// Payment Report with filters
router.get("/report", getPaymentReport);

// Get payments in frontend format
router.get("/", getPayments);

module.exports = router;
