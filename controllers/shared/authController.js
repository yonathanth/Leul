const bcrypt = require("bcryptjs");
const prisma = require("../../prisma/client");
const jwt = require("jsonwebtoken");

// Allowed user roles
const ALLOWED_ROLES = ["ADMIN", "EVENT_PLANNER", "VENDOR", "CLIENT"];

// Generate a JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Register a new user
const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = "CLIENT", // Default to 'CLIENT' if not provided
      phone,
      avatar,
      businessName, // For vendors
      serviceType, // For vendors
      companyName, // For event planners
      bio,
    } = req.body;

    // Check for required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: "Email, password, first name, and last name are required.",
      });
    }

    // Validate role
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error:
          "Invalid role. Allowed roles are: ADMIN, EVENT_PLANNER, VENDOR, CLIENT",
      });
    }

    // Check if email already exists
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ error: "Email is already taken." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phone: phone || null,
        avatar: avatar || null,
      },
    });

    let profileId = null;
    if (role === "CLIENT") {
      const client = await prisma.client.create({
        data: { userId: newUser.id },
      });
      profileId = client.id;
    } else if (role === "VENDOR") {
      try {
        console.log(
          "Creating vendor with account number:",
          req.body.accountNumber
        );
        const vendor = await prisma.vendor.create({
          data: {
            userId: newUser.id,
            businessName: businessName || "Unnamed Business",
            serviceType: serviceType || "General",
            accountNumber: req.body.accountNumber || null,
          },
        });
        profileId = vendor.id;
      } catch (error) {
        console.error("Error creating vendor:", error.message);
        throw error;
      }
    } else if (role === "EVENT_PLANNER") {
      const eventPlanner = await prisma.eventPlanner.create({
        data: {
          userId: newUser.id,
          bio: bio || null,
        },
      });
      profileId = eventPlanner.id;
    }

    const token = generateToken(newUser.id, newUser.role);

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        profileId,
      },
      token,
    });
  } catch (error) {
    console.error("Error in user register function:", error.message);
    return res
      .status(500)
      .json({ error: "Internal server error.", details: error.message });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Validate password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Get profile ID based on role
    let profileId = null;
    if (user.role === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
      });
      profileId = client?.id;
    } else if (user.role === "VENDOR") {
      const vendor = await prisma.vendor.findUnique({
        where: { userId: user.id },
      });
      profileId = vendor?.id;
    } else if (user.role === "EVENT_PLANNER") {
      const eventPlanner = await prisma.eventPlanner.findUnique({
        where: { userId: user.id },
      });
      profileId = eventPlanner?.id;
    }

    // Generate token with role included
    const token = generateToken(user.id, user.role);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profileId,
      },
    });
  } catch (error) {
    console.error("Error in user login function:", error.message);
    return res
      .status(500)
      .json({ error: "Internal server error.", details: error.message });
  }
};

module.exports = { register, login };
