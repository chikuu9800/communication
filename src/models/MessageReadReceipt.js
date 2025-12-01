import mongoose from "mongoose";

const messageReadReceiptSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure each user only has 1 read status per message
messageReadReceiptSchema.index({ messageId: 1, userId: 1 }, { unique: true });

// Prevent model overwrite in watch mode / hot reloads
const MessageReadReceipt =
  mongoose.models.MessageReadReceipt ||
  mongoose.model("MessageReadReceipt", messageReadReceiptSchema);

export default MessageReadReceipt;
