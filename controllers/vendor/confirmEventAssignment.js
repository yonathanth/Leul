const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Confirm (accept/decline) an event assignment for the vendor
const confirmEventAssignment = asyncHandler(async (req, res) => {
  // Fetch the vendor record using the user ID from the decoded token
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user.id },
  });

  if (!vendor) {
    res.status(404);
    throw new Error("Vendor profile not found");
  }

  const vendorId = vendor.id;
  const { assignmentId } = req.params;
  const { status } = req.body;

  // Validate the status field
  const validStatuses = ["ACCEPTED", "DECLINED"];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    res.status(400);
    throw new Error("Invalid status. Use 'accepted' or 'declined'.");
  }

  // Check if the assignment exists and belongs to the vendor
  const assignment = await prisma.assignedVendor.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    res.status(404);
    throw new Error("Event assignment not found");
  }

  if (assignment.vendorId !== vendorId) {
    res.status(403);
    throw new Error("Not authorized to confirm this event assignment");
  }

  // Check if the assignment is still pending
  if (assignment.status !== "PENDING") {
    res.status(400);
    throw new Error("Event assignment has already been confirmed or declined");
  }

  // Update the assignment status
  const updatedAssignment = await prisma.assignedVendor.update({
    where: { id: assignmentId },
    data: {
      status: status.toUpperCase(), // Store as "ACCEPTED" or "DECLINED"
      confirmedAt: new Date(), // Set the confirmation timestamp
    },
  });

  // Respond with the updated assignment
  res.status(200).json({
    success: true,
    data: {
      assignmentId: updatedAssignment.id,
      eventId: updatedAssignment.bookingId,
      vendorId: updatedAssignment.vendorId,
      status: updatedAssignment.status,
      updatedAt: updatedAssignment.updatedAt,
    },
  });
});

module.exports = {
  confirmEventAssignment,
};