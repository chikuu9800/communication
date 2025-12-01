import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },

    name: {
      type: String,
      required: function () {
        return this.type === "group"; // Only groups must have name
      },
    },

    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    inviteToken: { type: String },

    deletedAt: { type: Map, of: Date, default: {} },

    lastMessage: { type: String, default: "" },

    lastMessageTime: { type: Date, default: Date.now },

    unreadCounts: { type: Map, of: Number, default: {} }, // Per-user unread

    createdAt: { type: Date, default: Date.now },

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure unreadCounts is always a Map, not undefined
channelSchema.pre("save", function (next) {
  if (!this.unreadCounts) {
    this.unreadCounts = new Map();
  }
  next();
});

const Channel = mongoose.model("Channels", channelSchema);

export default Channel;
