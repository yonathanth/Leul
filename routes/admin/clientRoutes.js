const express = require("express");
const router = express.Router();
const {
  approveClientRegistration,
  blockClient,
  reportClient,
  viewClientDetails,
} = require("../../controllers/admin/client");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Approve Client Registration
router.patch("/:id/approve", approveClientRegistration);

// Block or Unblock Client
router.patch("/:id/block", blockClient);

// Report or Unreport Client
router.patch("/:id/report", reportClient);

// View Client Orders and Profile
router.get("/:id", viewClientDetails);

module.exports = router;
