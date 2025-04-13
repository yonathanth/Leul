const express = require("express");
const router = express.Router();
const {
  approveVendor,
  suspendVendor,
  viewVendorListings,
} = require("../../controllers/admin/vendors");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Approve Vendor
router.patch("/:id/approve", approveVendor);

// Suspend Vendor
router.patch("/:id/suspend", suspendVendor);

// View Vendor Listings
router.get("/", viewVendorListings);

module.exports = router;
