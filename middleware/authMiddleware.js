const asyncHandler = require("express-async-handler");

const checkRole = (allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    try {
      // Get token from header
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
      }

      // Verify token
      const decoded = (token) => {
        try {
          // Verify and decode the token
          return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          throw new Error("Invalid token");
        }
      };

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(decoded.role)) {
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
      console.error("Error in role check middleware:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  });
};

module.exports = checkRole;
