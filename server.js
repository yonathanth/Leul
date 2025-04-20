const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { errorHandler } = require("./middleware/errorMiddleware");
const { authMiddlewareSocket } = require("./middleware/authMiddleware");
const prisma = require("./prisma/client");

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration for Express
const corsOptions = {
  origin: "http://localhost:3000", // Ensure this matches your frontend URL
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use("/public", express.static("public"));

// Set up Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Match your frontend URL
    methods: ["GET", "POST"],
  },
});

// Apply WebSocket authentication middleware
io.use(authMiddlewareSocket);

// Socket.IO logic for real-time chat
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.id}`);

  // Mark user as online
  prisma.user.update({
    where: { id: socket.user.id },
    data: { isOnline: true },
  });

  // Join a conversation room
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
  });

  // Handle sending a message
  socket.on("sendMessage", async ({ conversationId, content, toUserId }) => {
    try {
      const message = await prisma.message.create({
        data: {
          content,
          fromUserId: socket.user.id,
          toUserId,
          conversationId,
        },
        include: { fromUser: true, toUser: true },
      });

      // Emit the message to the conversation room
      io.to(conversationId).emit("receiveMessage", message);
    } catch (error) {
      console.error("Error sending message:", error.message);
    }
  });

  // Mark message as read
  socket.on("markAsRead", async ({ messageId }) => {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: { read: true, lastSeen: new Date() },
      });
    } catch (error) {
      console.error("Error marking message as read:", error.message);
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    try {
      await prisma.user.update({
        where: { id: socket.user.id },
        data: { isOnline: false },
      });
      console.log(`User disconnected: ${socket.user.id}`);
    } catch (error) {
      console.error("Error handling disconnection:", error.message);
    }
  });
});

// Routes
app.use("/api/auth", require("./routes/shared/authRoutes"));

// Vendor Routes
app.use("/api/vendor", require("./routes/vendor/vendor"));
app.use("/api/vendor/conversations", require("./routes/vendor/vendormessage")); // Add vendor conversation routes

// Admin Routes
app.use("/api/admin/clients", require("./routes/admin/clientRoutes"));
app.use("/api/admin/dashboard", require("./routes/admin/dashboardRoutes"));
app.use(
  "/api/admin/event-planners",
  require("./routes/admin/eventPlannerRoutes")
);
app.use("/api/admin/feedback", require("./routes/admin/feedbackRoutes"));
app.use("/api/admin/vendors", require("./routes/admin/vendorRoutes"));

// Client Routes
app.use("/api/client/bookings", require("./routes/client/bookingRoutes"));
app.use("/api/client/feedback", require("./routes/client/feedbackRoutes"));
app.use("/api/client/services", require("./routes/client/servicesRoutes"));
app.use("/api/client/conversations", require("./routes/client/client")); // Add client conversation routes

app.get("/", (req, res) => {
  res.send("Api Up and Running!");
});

app.use(errorHandler);

// Start the server
httpServer.listen(port, () => console.log(`Server started on port ${port}`));
