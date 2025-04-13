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

app.use("/api/auth", require("./routes/shared/authRoutes"));

app.get("/", (req, res) => {
  res.send("Api Up and Running!");
});

app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));
