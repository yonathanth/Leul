const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

// General authentication middleware
const authenticate = asyncHandler(async (req, res, next) => {
  try {
    // Get token from header (Authorization: Bearer <token>)
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error("Token verification failed:", error.message);
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }

    // Attach user to request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error.message);
    res
      .status(401)
      .json({ message: "Not authorized, token validation failed" });
  }
});

const checkRole = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    try {
      // Get token from header (Authorization: Bearer <token>)
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res
          .status(401)
          .json({ message: "Not authorized, no token provided" });
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        console.error("Token verification failed:", error.message);
        return res
          .status(401)
          .json({ message: "Not authorized, invalid token" });
      }

      // Check if user has one of the allowed roles
      if (!decoded.role || !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          message: `Access denied. Requires one of these roles: ${allowedRoles.join(
            ", "
          )}`,
        });
      }

      // For vendors, verify their approval status
      if (decoded.role === "VENDOR") {
        try {
          // Find the vendor in the database
          const vendor = await prisma.vendor.findFirst({
            where: { userId: decoded.userId },
          });

          if (!vendor) {
            return res.status(404).json({
              message: "Vendor profile not found",
            });
          }

          // Check if the vendor is approved
          if (vendor.status !== "APPROVED") {
            // Allow access to account/profile routes for pending vendors
            const isAccountRoute =
              req.originalUrl.includes("/api/vendor/account") ||
              req.originalUrl.includes("/api/vendor/dashboard");

            if (isAccountRoute) {
              // Attach vendor status to the request object
              req.vendorStatus = vendor.status;
              req.user = decoded;
              return next();
            }

            return res.status(403).json({
              message:
                "Your vendor account is pending approval. You cannot access this resource until approved.",
              status: vendor.status,
            });
          }
        } catch (error) {
          console.error("Error checking vendor status:", error);
          return res.status(500).json({
            message: "Error verifying vendor status",
          });
        }
      }

      // Attach user to request object
      req.user = decoded;
      next();
    } catch (error) {
      console.error("Error in role check middleware:", error.message);
      res
        .status(401)
        .json({ message: "Not authorized, token validation failed" });
    }
  });
};

// WebSocket authentication middleware
const authMiddlewareSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error: No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error("WebSocket token verification failed:", error.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

module.exports = {
  authenticate,
  checkRole,
  authMiddlewareSocket,
};
