const io = require("socket.io-client");

const socket = io("http://localhost:5000", {
  auth: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5NGEzOGFlLTQ2MjktNGJiZC1iZWE5LThiMTA5NWI1NTRmOSIsInJvbGUiOiJDTElFTlQiLCJpYXQiOjE3NDUyMTU5NjMsImV4cCI6MTc0NTMwMjM2M30.8zu13Bj90MCfE65VJx_ICODrwQnoe3m1N3SxPmHMbSQ", // Replace with client JWT
  },
});

socket.on("connect", () => {
  console.log("Connected as", socket.id);
  socket.emit("joinConversation", "c4e091cd-aa5c-4024-b3d1-fbde85363063"); // Replace with valid conversationId

  socket.emit("sendMessage", {
    conversationId: "c4e091cd-aa5c-4024-b3d1-fbde85363063",
    content: "Test message",
    toUserId: "505efb77-0af3-4122-a9b1-eab8d7b1bec9", // Replace with vendor ID
  });
});

socket.on("receiveMessage", (message) => {
  console.log("Received message:", message);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});
