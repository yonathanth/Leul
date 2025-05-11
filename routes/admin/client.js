const express = require("express");
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  updateClientPassword,
} = require("../../controllers/admin/client");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole("ADMIN"));

// Get all clients
router.get("/", getClients);

// Get client by ID
router.get("/:id", getClientById);

// Create new client
router.post("/", createClient);

// Update client
router.patch("/:id", updateClient);

// Delete client
router.delete("/:id", deleteClient);

// Update client password
router.patch("/:id/password", updateClientPassword);

module.exports = router;
