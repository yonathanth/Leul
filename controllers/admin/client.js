const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Approve Client Registration
const approveClientRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params; // User ID

  // Find user
  const user = await prisma.user.findUnique({
    where: { id },
    include: { clientProfile: true },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "CLIENT") {
    res.status(400);
    throw new Error("User is not a client");
  }

  if (user.status === "APPROVED") {
    res.status(400);
    throw new Error("Client is already approved");
  }

  // Update user status to APPROVED
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: "APPROVED" },
    include: { clientProfile: true },
  });

  res.status(200).json({
    message: "Client registration approved successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      status: updatedUser.status,
      clientProfileId: updatedUser.clientProfile?.id,
    },
  });
});

// Block or Unblock Client
const blockClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body; // true to block, false to unblock

  if (typeof isBlocked !== "boolean") {
    res.status(400);
    throw new Error("isBlocked must be a boolean value");
  }

  // Check if user exists and is a client
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "CLIENT") {
    res.status(400);
    throw new Error("User is not a client");
  }

  // Update block status
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isBlocked },
  });

  res.status(200).json({
    message: `Client ${isBlocked ? "blocked" : "unblocked"} successfully`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      isBlocked: updatedUser.isBlocked,
    },
  });
});

// Report or Unreport Client
const reportClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isReported } = req.body; // true to report, false to unreport

  if (typeof isReported !== "boolean") {
    res.status(400);
    throw new Error("isReported must be a boolean value");
  }

  // Check if user exists and is a client
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "CLIENT") {
    res.status(400);
    throw new Error("User is not a client");
  }

  // Update report status
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isReported },
  });

  res.status(200).json({
    message: `Client ${isReported ? "reported" : "unreported"} successfully`,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      isReported: updatedUser.isReported,
    },
  });
});

// View Client Orders and Profile
const viewClientDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch user with client profile and bookings
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      clientProfile: {
        include: {
          bookings: {
            select: {
              id: true,
              eventDate: true,
              location: true,
              status: true,
              attendees: true,
              specialRequests: true,
              service: { select: { name: true, price: true, category: true } },
              eventPlanner: { select: { companyName: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role !== "CLIENT") {
    res.status(400);
    throw new Error("User is not a client");
  }

  // Prepare response
  const profile = user.clientProfile
    ? {
        id: user.clientProfile.id,
        type: "Client",
      }
    : null;

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      isBlocked: user.isBlocked,
      isReported: user.isReported,
      createdAt: user.createdAt,
    },
    profile,
    bookings: user.clientProfile?.bookings || [],
  });
});

module.exports = {
  approveClientRegistration,
  blockClient,
  reportClient,
  viewClientDetails,
};
