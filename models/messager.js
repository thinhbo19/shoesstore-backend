import mongoose from "mongoose";
var messSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
    },
    senderId: {
      type: String,
    },
    text: {
      type: String,
    },
  },
  { timestamps: true }
);

const Mess = mongoose.model("Mess", messSchema);
export default Mess;
