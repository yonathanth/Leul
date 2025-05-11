const express = require("express");
const router = express.Router();
const {
  approveVendor,
  editVendor,
  deleteVendor,
  suspendVendor,
  viewVendorListings,
  getVendorById,
} = require("../../controllers/admin/vendors");
const { checkRole } = require("../../middleware/authMiddleware");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Middleware to ensure only ADMIN can access these routes
router.use(checkRole(["ADMIN", "EVENT_PLANNER"]));

// The order of routes is important - specific routes should come before generic ones
// Approve Vendor
router.post("/:id/approve", approveVendor);

// Suspend Vendor
router.post("/:id/suspend", suspendVendor);

// Block Vendor
router.patch("/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!vendor) {
      res.status(404);
      throw new Error("Vendor not found");
    }

    // Update the user's isBlocked field
    const updatedUser = await prisma.user.update({
      where: { id: vendor.userId },
      data: { isBlocked: blocked },
    });

    res.status(200).json({
      message: blocked
        ? "Vendor blocked successfully"
        : "Vendor unblocked successfully",
      id,
      isBlocked: updatedUser.isBlocked,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
});

// Get vendor by ID
router.get("/:id", getVendorById);

// Edit Vendor
router.patch("/:id", editVendor);

// Delete vendor
router.delete("/:id", deleteVendor);

// View Vendor Listings (This should be the last route)
router.get("/", viewVendorListings);

module.exports = router;
