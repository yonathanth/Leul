const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  handleWebhook,
  verifyPayment,
  getPayments,
} = require("../../controllers/client/payment");
const { checkRole } = require("../../middleware/authMiddleware");

router.post("/initiate", checkRole(["CLIENT"]), initiatePayment);
router.post("/verify", checkRole(["CLIENT"]), verifyPayment);
router.get("/", checkRole(["CLIENT"]), getPayments);

router.post("/webhook", handleWebhook); // Important: No auth middleware here

module.exports = router;
