const express = require("express");
const { register, login } = require("../../controllers/shared/authController"); // Ensure this is the correct path
const router = express.Router();
const checkRole = require("../../middleware/authMiddleware"); // Ensure this is the correct path
// Register and login routes

router.post("/register", register);
router.post("/login", login);

module.exports = router;
