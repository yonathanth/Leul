const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

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

module.exports = { checkRole, authMiddlewareSocket };
