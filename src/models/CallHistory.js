import mongoose from "mongoose";

const callHistorySchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["missed", "completed", "rejected"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CallHistory", callHistorySchema);
