const express = require("express");
const router = express.Router();
const {
  getClients,
  getClientById,
  toggleClientBlock,
  reportClient,
} = require("../../controllers/eventplanner/clients");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only EVENT_PLANNER can access these routes
router.use(checkRole("EVENT_PLANNER"));

// Basic client routes
router.get("/", getClients);
router.get("/:id", getClientById);

// Client management routes
router.patch("/:id/block", toggleClientBlock);
router.patch("/:id/report", reportClient);

module.exports = router;
