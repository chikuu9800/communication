import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Basic auth fields
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Role-based access
    role: {
      type: String,
      enum: ["member", "agent", "admin"],
      default: "member",
    },

    // Profile details
    phone: { type: String },
    location: { type: String },
    position: { type: String }, // occupation in UI
    bio: { type: String },      // about in UI
    joinDate: { type: Date, default: Date.now },

    // Social links
    socialLinks: {
      twitter: { type: String },
      github: { type: String },
      linkedin: { type: String },
    },

    // Avatar
    avatar: {
      path: String,
      filename: String,
      uploadedAt: Date,
    },

  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
