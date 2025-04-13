const express = require("express");
const router = express.Router();
const { browseServices } = require("../../controllers/client/services");
const checkRole = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access this route
router.use(checkRole("CLIENT"));

// Browse Services
router.get("/", browseServices);

module.exports = router;
