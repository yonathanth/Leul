const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Start a new conversation with a vendor
const startConversation = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;
  const clientId = req.user.id;
  console.log("req.user:", req.user);
  console.log("vendorId:", vendorId);
  console.log("clientId:", clientId);
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: clientId }, { id: vendorId }],
      },
    },
    include: { participants: true },
  });

  res.status(201).json(conversation);
});

// Get all conversations for the client
const getConversations = asyncHandler(async (req, res) => {
  const clientId = req.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: clientId } },
    },
    include: { participants: true, messages: true },
  });

  res.status(200).json(conversations);
});

module.exports = { startConversation, getConversations };
