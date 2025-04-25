const express = require("express");
const router = express.Router();
const { giveFeedback } = require("../../controllers/client/feedback");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access this route
router.use(checkRole("CLIENT"));

// Give Feedback and Rating
router.post("/", giveFeedback);

module.exports = router;
