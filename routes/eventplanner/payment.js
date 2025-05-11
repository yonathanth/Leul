const express = require("express");
const router = express.Router();
const {
  getPayments,
  getPaymentStats,
} = require("../../controllers/eventplanner/payment");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only EVENT_PLANNER can access these routes
router.use(checkRole("EVENT_PLANNER"));

router.get("/", getPayments);
router.get("/stats", getPaymentStats);

module.exports = router;
