import User from "../models/user.js";
import handlePassword from "../utils/hash_password.js";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import dotenv from "dotenv";
import token_Email from "../utils/token_email.js";
import sendMail from "../utils/sendmail.js";
import crypto from "crypto";
dotenv.config();
const authControllers = {
  // Register
  registerUser: asyncHandler(async (req, res) => {
    const hashed = await handlePassword.hashPassword(req.body.password);
    const CheckEmailExiSt = await User.findOne({ email: req.body.email });
    if (CheckEmailExiSt) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already exists" });
    }
    // Create a new user
    const newUser = new User({
      username: req.body.username,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      password: hashed,
    });

    const savedUser = await newUser.save();
    return res.status(200).json({
      success: savedUser ? true : false,
      CreateUser: savedUser ? savedUser : "Cannot create user",
    });
  }),
  registerUserForTest: asyncHandler(async (req, res) => {
    const { username, phoneNumber, email, password } = req.body;

    const CheckEmailExiSt = await User.findOne({ email });
    if (CheckEmailExiSt) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already exists" });
    }
    // Create a new user
    const newUser = new User({
      username,
      phoneNumber,
      email,
      password,
    });

    const savedUser = await newUser.save();
    return res.status(200).json({
      success: savedUser ? true : false,
      CreateUser: savedUser ? savedUser : "Cannot create user",
    });
  }), //accessToken
  functionAccessToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.MY_PRIVATE_KEY,
      {
        expiresIn: "2d",
      }
    );
  },
  functionRefreshToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.MY_FRESH_KEY,
      {
        expiresIn: "365d",
      }
    );
  },
  //login
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email không đúng!",
        });
      }
      if (user.isBlocked === true) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản của bạn đã bị khóa!",
        });
      }
      const validPassword = await handlePassword.comparePassword(
        password,
        user.password
      );
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: "Mật khẩu không đúng!",
        });
      }
      const accessToken = authControllers.functionAccessToken(user);
      const refreshToken = authControllers.functionRefreshToken(user);
      user.refresh_token = refreshToken;
      await user.save();
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false, // Trong môi trường production, secure: true để sử dụng HTTPS
        path: "/",
        sameSite: "strict",
      });
      const { password: userPassword, ...userData } = user._doc;
      res.status(200).json({ user: userData, accessToken });
    } catch (error) {
      console.error("Lỗi khi đăng nhập:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi đăng nhập.",
      });
    }
  },
  loginUserForTest: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, password });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Email hoặc password không đúng!",
        });
      }
      if (user.isBlocked === true) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản của bạn đã bị khóa!",
        });
      }

      const accessToken = authControllers.functionAccessToken(user);
      const refreshToken = authControllers.functionRefreshToken(user);
      user.refresh_token = refreshToken;
      await user.save();
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
      });
      const { password: userPassword, ...userData } = user._doc;
      res.status(200).json({ user: userData, accessToken });
    } catch (error) {
      console.error("Lỗi khi đăng nhập:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi đăng nhập.",
      });
    }
  },
  requestRefreshToken: async (req, res) => {
    const refreshToken = req.cookie.refreshToken;
    if (!refreshToken) throw new Error("you're not authenticated");
    const foundUser = await User.findOne({
      refresh_token: req.body.refreshToken,
    }); //{ email: req.body.email
    if (!foundUser) {
      throw new Error("Invalid refreshToken"); // Token không tồn tại trong cơ sở dữ liệu
    }
    jwt.verify(refreshToken, process.env.MY_FRESH_KEY, async (error, user) => {
      if (error) {
        console.log(error);
      }

      const newAccessToken = authControllers.functionAccessToken(user);
      const newRefreshToken = authControllers.functionRefreshToken(user);
      user.refresh_token = newRefreshToken;
      await user.save();
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        samSite: "strict",
      });
      res.status(200).json({ AccessToken: newAccessToken });
    });
  },
  logout: async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken;
      res.clearCookie("refreshToken");
      const user = await User.findOne({ refresh_token: refreshToken });
      if (!user) {
        throw new Error({ mes: "Invalid refresh token" });
      }
      user.refresh_token = null;
      await user.save();
      res.status(200).json({ message: "Logged out successfully" });
    } catch {
      res.status(500).json("error");
    }
  },

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) throw new Error("Please enter a valid email");
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");
    const resetToken = await token_Email.createToken(user);
    await user.save();
    const html = ` Please copy a resetToken:"${resetToken}" and click the link below to reset your password of you account. 
            <a href=${process.env.CLIENT_URL}/dang-nhap/reset-password>Click here</a>`;

    const data = {
      email,
      html,
      resetToken,
    };
    const response = await sendMail(data);
    setTimeout(async () => {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }, 15 * 60 * 1000);
    res.status(200).json({
      success: response ? true : false,
      message: response ? "Check your email" : "Cannot send email",
      token: resetToken,
    });
  }),
  forgotPasswordToTest: asyncHandler(async (req, res) => {
    const { email } = req.query;
    if (!email) throw new Error("Please enter a valid email");
    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");
    const resetToken = await token_Email.createToken(user);
    await user.save();
    setTimeout(async () => {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }, 15 * 60 * 1000);
    res.status(200).json({
      success: true,
      message: "Token is created successfully!",
      token: resetToken,
    });
  }),
  resetPasswordToTest: async (req, res) => {
    const { token, password, email } = req.body;
    console.log(password);
    if (!token || !password)
      return res.status(400).json("Missing token or password");
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json("Invalid token or token expired");
    }
    user.password = password;
    await user.save();
    res.status(200).json({
      success: user ? true : false,
      message: user ? "Reset password successfully" : "Update Password Failed",
    });
  },
  resetPassword: async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json("Missing token or password");
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      passwordResetToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json("Invalid token or token expired");
    }
    const hashed = await handlePassword.hashPassword(password);
    user.password = hashed;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.status(200).json({
      success: user ? true : false,
      message: user ? "Reset password successfully" : "Update Password Failed",
    });
  },
  blockAccount: async (req, res) => {
    try {
      const { userId, isBlocked } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.isBlocked = isBlocked !== undefined ? isBlocked : user.isBlocked;
      const updatedUser = await user.save();

      res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  },
  changeRole: async (req, res) => {
    try {
      const { userId, newRole } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found!!" });
      }
      const validRoles = ["Admin", "User", "Staff"];
      if (!validRoles.includes(newRole)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      user.role = newRole;
      const updatedUser = await user.save();

      res.status(200).json({
        message: "Change role successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error when change",
        error: error.message,
      });
    }
  },
};

export default authControllers;
