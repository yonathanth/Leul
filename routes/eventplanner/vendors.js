const express = require("express");
const router = express.Router();
const {
  getVendors,
  getVendorById,
  updateVendorStatus,
  toggleVendorBlock,
  reportVendor,
  updateVendor,
} = require("../../controllers/eventplanner/vendors");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only EVENT_PLANNER can access these routes
router.use(checkRole("EVENT_PLANNER"));

// Basic vendor routes
router.get("/", getVendors);
router.get("/:id", getVendorById);
router.patch("/:id", updateVendor);

// Vendor management routes
router.patch("/:id/status", updateVendorStatus);
router.patch("/:id/block", toggleVendorBlock);
router.patch("/:id/report", reportVendor);

module.exports = router;
