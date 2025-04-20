const express = require("express");
const router = express.Router();
const { checkRole } = require("../../middleware/authMiddleware"); // Import checkRole instead of authMiddleware
const prisma = require("../../prisma/client");

// Start a new conversation with a client (restricted to vendors)
router.post("/conversation", checkRole(["VENDOR"]), async (req, res) => {
  const { clientId } = req.body;
  const vendorId = req.user.id;

  try {
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: [{ id: vendorId }, { id: clientId }],
        },
      },
      include: { participants: true },
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// Get all conversations for the vendor (restricted to vendors)
router.get("/conversations", checkRole(["VENDOR"]), async (req, res) => {
  const vendorId = req.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { id: vendorId } },
      },
      include: { participants: true, messages: true },
    });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

module.exports = router;
