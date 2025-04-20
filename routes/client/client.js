const express = require("express");
const router = express.Router();
const { authMiddlewareSocket } = require("../../middleware/authMiddleware");
const prisma = require("../../prisma/client");

// Start a new conversation with a vendor
router.post("/conversation", authMiddlewareSocket, async (req, res) => {
  const { vendorId } = req.body;
  const clientId = req.user.id;

  try {
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: clientId }, { id: vendorId }],
        },
      },
      include: { participants: true },
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// Get all conversations for the client
router.get("/conversations", authMiddlewareSocket, async (req, res) => {
  const clientId = req.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: clientId } },
      },
      include: { participants: true, messages: true },
    });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

module.exports = router;
