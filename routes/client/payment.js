const express = require("express");
const router = express.Router();
const { initiatePayment } = require("../../controllers/client/payment");
const { checkRole } = require("../../middleware/authMiddleware");

router.use(checkRole(["CLIENT"]));

router.post("/initiate", initiatePayment);

module.exports = router;
