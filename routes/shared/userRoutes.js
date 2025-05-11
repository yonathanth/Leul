const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateUser,
} = require("../../controllers/shared/userController");
const { authenticate } = require("../../middleware/authMiddleware");

// Apply auth middleware to all routes
router.use(authenticate);

// Get user profile
router.get("/profile", getProfile);

// Update user profile
router.patch("/update/:id", updateUser);

module.exports = router;
