const express = require("express");
const router = express.Router();
const {
  blockClient,
  editClient,
  reportClient,
  viewClientDetails,
  deleteClient,
} = require("../../controllers/admin/client");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole(["ADMIN"]));

// Block or Unblock Client
router.patch("/:id/block", blockClient);

router.delete("/:id", deleteClient);

router.patch("/:id", editClient);

// Report or Unreport Client
router.patch("/:id/report", reportClient);

// View Client Orders and Profile
router.get("/:id", viewClientDetails);

module.exports = router;
