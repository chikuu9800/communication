import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  fileName: String,
  fileType: String,
  fileSize: Number,
  fileUrl: String,  // "/uploads/168923-image.jpg"
});

const messageSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  text: {
    type: String,
    trim: true,
    required: function () {
      return this.attachments.length === 0;
    },
  },


  attachments: [attachmentSchema],


  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },

  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },

  status: {
    type: String,
    enum: ["sent", "seen"],
    default: "sent",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
