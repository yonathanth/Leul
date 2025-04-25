const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Start a new conversation with a client (restricted to vendors)
const startConversation = asyncHandler(async (req, res) => {
  const { clientId } = req.body;
  const vendorId = req.user.id;

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        connect: [{ id: vendorId }, { id: clientId }],
      },
    },
    include: { participants: true },
  });
  res.status(201).json(conversation);
});

// Get all conversations for the vendor (restricted to vendors)
const getVendorConversations = asyncHandler(async (req, res) => {
  const vendorId = req.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: vendorId } },
    },
    include: { participants: true, messages: true },
  });
  res.status(200).json(conversations);
});

module.exports = {
  startConversation,
  getVendorConversations,
};
