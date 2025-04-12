const express = require("express");
const { register, login } = require("../../controllers/shared/authController"); // Ensure this is the correct path
const router = express.Router();
const checkRole = require("../middleware/checkRole");
// Register and login routes

router.post(
  "/register",
  checkRole(["admin", "user", "vendor", "planner"]),
  register
);
router.post("/login", login);

module.exports = router;
