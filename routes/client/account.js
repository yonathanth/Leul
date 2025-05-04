const express = require("express");
const router = express.Router();
const { editAccount, getProfile } = require("../../controllers/client/account");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access these routes
router.use(checkRole("CLIENT"));

router.get("/profile", getProfile); // Get user profile
router.patch("/:id", editAccount); // Edit account details

module.exports = router;
