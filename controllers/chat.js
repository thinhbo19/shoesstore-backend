import ChatModel from "../models/chat.js";
import UserModel from "../models/user.js";
import asyncHandler from "express-async-handler";

const ChatControls = {
  createChat: asyncHandler(async (req, res) => {
    try {
      const users = await UserModel.find({
        role: { $nin: ["Admin", "Staff"] },
      }).select("_id");

      const csdUsers = await UserModel.find({
        role: "Staff",
      }).select("_id");

      if (users.length === 0 || csdUsers.length === 0) {
        return res
          .status(400)
          .json({ message: "No users or Staff accounts found" });
      }

      const userIds = users.map((user) => user._id.toString());
      const csdUserIds = csdUsers.map((csdUser) => csdUser._id.toString());

      const chats = [];
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const csdUserId = csdUserIds[i % csdUserIds.length];

        const existingChat = await ChatModel.findOne({
          members: { $all: [userId, csdUserId] },
        });

        if (!existingChat) {
          const newChat = new ChatModel({
            members: [userId, csdUserId],
          });
          const response = await newChat.save();
          chats.push(response);
        }
      }

      if (chats.length > 0) {
        return res.status(200).json(chats);
      } else {
        return res
          .status(400)
          .json({ message: "Chats already exist for all users" });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }),
  findOneChat: asyncHandler(async (req, res) => {
    const { _id } = req.params;
    try {
      const chats = await ChatModel.find({ _id });
      return res.status(200).json(chats);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }),
  findUserChat: asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    try {
      const chats = await ChatModel.find({
        members: { $in: [userId] },
      });
      return res.status(200).json(chats);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }),
  findChat: asyncHandler(async (req, res) => {
    const { firstId, secondId } = req.params;
    try {
      const chat = await ChatModel.findOne({
        members: { $in: [firstId, secondId] },
      });
      return res.status(200).json(chat);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }),
  deleteChat: asyncHandler(async (req, res) => {
    const { _id } = req.params;
    try {
      const chat = await ChatModel.findByIdAndDelete(_id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      return res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }),
};
export default ChatControls;
