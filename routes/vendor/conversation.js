const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middleware/authMiddleware");
const {
  startConversation,
  getVendorConversations,
} = require("../../controllers/vendor/conversation");

// Start a new conversation with a client
router.post("/conversations", checkRole(["VENDOR"]), startConversation);

// Get all conversations for the vendor
router.get("/conversations", checkRole(["VENDOR"]), getVendorConversations);

module.exports = router;
