import jwt from "jsonwebtoken";
import User from "../models/user.js";

const middlewareControllers = {
  // Verify Token
  verifyToken: (req, res, next) => {
    const token = req.headers.token || req.headers.authorization;
    if (token) {
      const accessToken = token.split(" ")[1];
      if (!accessToken) {
        return res.status(401).json("Token is missing");
      }
      jwt.verify(accessToken, process.env.MY_private_key, (error, user) => {
        if (error) {
          console.error("Token verification failed:", error);
          return res.status(403).json("Token is not valid");
        }
        req.user = user;
        next();
      });
    } else {
      return res.status(401).json("You're not authenticated");
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
            message: "You are not admin or staff!!!!!",
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
