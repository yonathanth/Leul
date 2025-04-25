const express = require("express");
const router = express.Router();
const {
  startConversation,
  getConversations,
} = require("../../controllers/client/conversation");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only CLIENT can access these routes
router.use(checkRole(["CLIENT"]));

// Start a new conversation with a vendor
router.post("/conversation", startConversation);

// Get all conversations for the client
router.get("/conversations", getConversations);

module.exports = router;
