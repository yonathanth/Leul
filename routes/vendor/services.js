const express = require("express");
const router = express.Router();
const {
  addService,
  deleteService,
  updateService,
  getVendorServices,
} = require("../../controllers/vendor/services");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access these routes
router.use(checkRole(["VENDOR"]));

// Add a new service listing
router.post("/", addService);

// Delete an existing service listing
router.delete("/:serviceId", deleteService);

// Update an existing service listing
router.patch("/:serviceId", updateService);

// Get all services for a vendor
router.get("/", getVendorServices);

module.exports = router;
