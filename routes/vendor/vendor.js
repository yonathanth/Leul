const express = require("express");
const router = express.Router();
const { getDashboardOverview } = require("../../controllers/vendor/dashboard");
const { addService } = require("../../controllers/vendor/addService");
const { updateService } = require("../../controllers/vendor/updateService");
const { deleteService } = require("../../controllers/vendor/deleteService");
const { confirmEventAssignment } = require("../../controllers/vendor/confirmEventAssignment");
const { getAvailability } = require("../../controllers/vendor/getAvailability");
const { updateAvailability } = require("../../controllers/vendor/updateAvailability");
const { getPayments } = require("../../controllers/vendor/getPayments");
const checkRole = require("../../middleware/authMiddleware");

// Protect routes and ensure the user is a VENDOR
router.use(checkRole("VENDOR"));

// Vendor Dashboard Overview
router.get("/dashboard-overview", getDashboardOverview);

// Add a new service listing
router.post("/services", addService);

// Update an existing service listing
router.patch("/services/:serviceId", updateService);

// Delete an existing service listing
router.delete("/services/:serviceId", deleteService);

// Confirm an event assignment
router.patch("/event-assignments/:assignmentId/confirm", confirmEventAssignment);

// Get vendor availability
router.get("/availability", getAvailability);

// Update vendor availability
router.patch("/availability", updateAvailability);

// Get vendor payments
router.get("/payments", getPayments);

module.exports = router;