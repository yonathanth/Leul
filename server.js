const cors = require("cors");
const express = require("express");
const dotenv = require("dotenv");
const port = process.env.PORT || 5000;
const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// Middleware configuration
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
const corsOptions = {
  origin: "localhost:3000",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use("/public", express.static("public"));

// Routes
app.use("/api/auth", require("./routes/shared/authRoutes"));

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

app.get("/", (req, res) => {
  res.send("Api Up and Running!");
});

app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
