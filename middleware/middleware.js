import jwt from "jsonwebtoken";
import User from "../models/user.js";

const middlewareControllers = {
  // Verify Token
  verifyToken: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token is missing or invalid" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Token is missing" });
      }

      jwt.verify(token, process.env.MY_private_key, (error, user) => {
        if (error) {
          console.error("Token verification failed:", error);
          return res.status(403).json({ message: "Token is not valid" });
        }
        req.user = user;
        next();
      });
    } catch (error) {
      console.error("Error in verifyToken middleware:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // Verify Admin Authorization
  verifyTokenAdminAuth: async (req, res, next) => {
    middlewareControllers.verifyToken(req, res, async () => {
      try {
        const userCur = await User.findById(req.user.id).select("role");
        if (
          !userCur ||
          (userCur.role !== "Admin" && userCur.role !== "Staff")
        ) {
          return res.status(401).json({
            success: false,
            message: "You are not admin or staff!",
          });
        }
        next();
      } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });
  },
};

export default middlewareControllers;
