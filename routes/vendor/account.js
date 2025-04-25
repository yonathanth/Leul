const express = require("express");
const router = express.Router();
const { editVendorAccount } = require("../../controllers/vendor/account");
const { checkRole } = require("../../middleware/authMiddleware");

// Middleware to ensure only VENDOR can access this route
router.use(checkRole(["VENDOR"]));

// Update vendor account details
router.patch("/:id", editVendorAccount);

module.exports = router;
