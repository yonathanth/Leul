const express = require("express");
const { register, login } = require("../../controllers/shared/authController"); // Ensure this is the correct path
const router = express.Router();
// Register and login routes

router.post("/register", register);
router.post("/login", login);

module.exports = router;
