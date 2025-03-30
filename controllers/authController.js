const bcrypt = require("bcryptjs");
const prisma = require("../../prisma/client");
const jwt = require("jsonwebtoken");

// Allowed user roles
const ALLOWED_ROLES = ["admin", "user", "vendor", "planner"];

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
      userName,
      password,
      role = "user", // Default to 'user' if not provided
    } = req.body;

    // Check for required fields
    if (!userName || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    // Validate role
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Allowed roles are: admin, user, vendor, planner",
      });
    }

    // Check if username already exists
    const userExists = await prisma.user.findUnique({
      where: { userName },
    });

    if (userExists) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        userName,
        password: hashedPassword,
        role: role, // Use the provided role (or default to 'user')
      },
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser.id,
        userName: newUser.userName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error in user register function:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Validate input
    if (!userName || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: {
        userName: userName,
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Validate password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Generate token with role included
    const token = generateToken(user.id, user.role);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        userName: user.userName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in user login function:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { register, login };
