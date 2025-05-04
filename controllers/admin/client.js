const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");
const bcrypt = require("bcryptjs");

// Get all clients
const getClients = asyncHandler(async (req, res) => {
  const clients = await prisma.client.findMany({
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          isBlocked: true,
        },
      },
    },
  });

  const formattedClients = clients.map(client => ({
    id: client.id,
    name: `${client.user.firstName} ${client.user.lastName}`,
    email: client.user.email,
    phone: client.user.phone,
    createdAt: client.user.createdAt,
    isActive: !client.user.isBlocked,
  }));

  res.status(200).json(formattedClients);
});

// Get client by ID
const getClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          isBlocked: true,
        },
      },
    },
  });

  if (!client) {
    res.status(404);
    throw new Error('Client not found');
  }

  const formattedClient = {
    id: client.id,
    name: `${client.user.firstName} ${client.user.lastName}`,
    email: client.user.email,
    phone: client.user.phone,
    createdAt: client.user.createdAt,
    isActive: !client.user.isBlocked,
  };

  res.status(200).json(formattedClient);
});

// Create new client
const createClient = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Check if user already exists
  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user and client
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'CLIENT',
    },
  });

  const newClient = await prisma.client.create({
    data: {
      userId: newUser.id,
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });

  const formattedClient = {
    id: newClient.id,
    name: `${newClient.user.firstName} ${newClient.user.lastName}`,
    email: newClient.user.email,
    phone: newClient.user.phone,
    createdAt: newClient.user.createdAt,
    isActive: true,
  };

  res.status(201).json(formattedClient);
});

// Update client
const updateClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, isActive } = req.body;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!client) {
    res.status(404);
    throw new Error('Client not found');
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: client.userId },
    data: {
      firstName,
      lastName,
      phone,
      isBlocked: !isActive,
    },
  });

  const formattedClient = {
    id: client.id,
    name: `${updatedUser.firstName} ${updatedUser.lastName}`,
    email: updatedUser.email,
    phone: updatedUser.phone,
    createdAt: updatedUser.createdAt,
    isActive: !updatedUser.isBlocked,
  };

  res.status(200).json(formattedClient);
});

// Delete client
const deleteClient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!client) {
    res.status(404);
    throw new Error('Client not found');
  }

  // Delete client and user (cascade)
  await prisma.user.delete({
    where: { id: client.userId },
  });

  res.status(200).json({ message: 'Client deleted successfully' });
});

// Update client password
const updateClientPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!client) {
    res.status(404);
    throw new Error('Client not found');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update password
  await prisma.user.update({
    where: { id: client.userId },
    data: { password: hashedPassword },
  });

  res.status(200).json({ message: 'Password updated successfully' });
});

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  updateClientPassword,
};
