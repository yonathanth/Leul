const express = require("express");
const router = express.Router();
const { editAccount } = require("../../controllers/client/account");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access these routes
router.use(checkRole("CLIENT"));

router.patch("/:id", editAccount); // Edit account details
