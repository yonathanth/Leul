const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// @desc    Get all clients
// @route   GET /api/eventplanner/clients
// @access  Private (Event Planner only)
const getClients = asyncHandler(async (req, res) => {
  const {
    _start = 0,
    _end = 10,
    _sort = "createdAt",
    _order = "DESC",
    firstName_like,
    lastName_like,
    email_like,
  } = req.query;

  const where = {};

  // Add filters if provided
  if (firstName_like || lastName_like || email_like) {
    where.user = {};

    if (firstName_like) {
      where.user.firstName = {
        contains: firstName_like,
      };
    }

    if (lastName_like) {
      where.user.lastName = {
        contains: lastName_like,
      };
    }

    if (email_like) {
      where.user.email = {
        contains: email_like,
      };
    }
  }

  // Count total records
  const total = await prisma.client.count({
    where,
  });

  // Get clients
  const clients = await prisma.client.findMany({
    where,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true,
          isBlocked: true,
          isReported: true,
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
          eventDate: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: {
      user: {
        [_sort]: _order.toLowerCase(),
      },
    },
    skip: Number(_start),
    take: Number(_end) - Number(_start),
  });

  // Transform data for response
  const transformedClients = clients.map((client) => {
    // Calculate total spent
    const totalSpent = client.payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Get booking counts by status
    const bookingCounts = {
      total: client.bookings.length,
      pending: client.bookings.filter((b) => b.status === "PENDING").length,
      confirmed: client.bookings.filter((b) => b.status === "CONFIRMED").length,
      completed: client.bookings.filter((b) => b.status === "COMPLETED").length,
      cancelled: client.bookings.filter((b) => b.status === "CANCELLED").length,
    };

    return {
      id: client.id,
      userId: client.userId,
      firstName: client.user.firstName,
      lastName: client.user.lastName,
      email: client.user.email,
      phone: client.user.phone,
      avatar: client.user.avatar,
      createdAt: client.user.createdAt,
      isBlocked: client.user.isBlocked,
      isReported: client.user.isReported,
      totalSpent,
      bookingCounts,
    };
  });

  res.set("x-total-count", total.toString());
  res.set("Access-Control-Expose-Headers", "x-total-count");
  res.status(200).json(transformedClients);
});

// @desc    Get client by ID
// @route   GET /api/eventplanner/clients/:id
// @access  Private (Event Planner only)
const getClientById = asyncHandler(async (req, res) => {
  const clientId = req.params.id;

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true,
          isBlocked: true,
          isReported: true,
        },
      },
      bookings: {
        include: {
          service: {
            include: {
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  description: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      feedbacks: {
        include: {
          toUser: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Format client data for React Admin data provider
  // The React Admin data provider expects the response in the format { data: { id: ..., ... } }
  const formattedClient = {
    ...client,
    id: client.id, // Ensure id is included at the top level
    // Include additional calculated fields if needed
    totalSpent: client.payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((sum, payment) => sum + payment.amount, 0),
    bookingCounts: {
      total: client.bookings.length,
      pending: client.bookings.filter((b) => b.status === "PENDING").length,
      confirmed: client.bookings.filter((b) => b.status === "CONFIRMED").length,
      completed: client.bookings.filter((b) => b.status === "COMPLETED").length,
      cancelled: client.bookings.filter((b) => b.status === "CANCELLED").length,
    },
  };

  // Return data in the format expected by React Admin
  res.status(200).json({ data: formattedClient });
});

// @desc    Block/Unblock client
// @route   PATCH /api/eventplanner/clients/:id/block
// @access  Private (Event Planner only)
const toggleClientBlock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { blocked } = req.body;

  if (typeof blocked !== "boolean") {
    res.status(400);
    throw new Error("The 'blocked' field is required and must be a boolean");
  }

  // Find client to get the userId
  const client = await prisma.client.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Update the user's isBlocked status
  const updatedUser = await prisma.user.update({
    where: { id: client.userId },
    data: { isBlocked: blocked },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isBlocked: true,
    },
  });

  res.status(200).json({
    message: blocked
      ? "Client has been blocked successfully"
      : "Client has been unblocked successfully",
    user: updatedUser,
  });
});

// @desc    Report client
// @route   PATCH /api/eventplanner/clients/:id/report
// @access  Private (Event Planner only)
const reportClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error("Reason for reporting is required");
  }

  // Find client to get the userId
  const client = await prisma.client.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Update the user's isReported status
  const updatedUser = await prisma.user.update({
    where: { id: client.userId },
    data: { isReported: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isReported: true,
    },
  });

  // In a real app, you might want to store the report reason in a separate reports table
  // For now, we'll just log it and update the status
  console.log(`Client ${id} reported for: ${reason}`);

  res.status(200).json({
    message: "Client has been reported successfully",
    user: updatedUser,
  });
});

module.exports = {
  getClients,
  getClientById,
  toggleClientBlock,
  reportClient,
};
