import User from "../models/User.js";
import { getIO } from "../services/socketio.service.js";
import fs from "fs";
import path from "path";
// List all users (basic info)
export const listUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const sanitizedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar?.path || "",
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.log("getCurrentUser: Missing token user", req.headers);
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await User.findById(req.user.id).select("name email avatar");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar?.path || "",
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Get full profile
export const getProfile = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await User.findById(req.user.id).select("-password -__v");

    if (!user) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileData = {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      location: user.location || "",
      occupation: user.position || "",
      joinDate: user.joinDate
        ? user.joinDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "",
      bio: user.bio || "",
      socialLinks: {
        twitter: user.socialLinks?.twitter || "",
        github: user.socialLinks?.github || "",
        linkedin: user.socialLinks?.linkedin || "",
      },

      // ✅ FIXED: Use your actual avatar format
      avatar: user.avatar
        ? {
          path: user.avatar.path,
          filename: user.avatar.filename,
          uploadedAt: user.avatar.uploadedAt,
        }
        : { path: "", filename: "", uploadedAt: "" },
    };

    res.json(profileData);
  } catch (err) {
    console.error("Error in getProfile:", err);
    next(err);
  }
};

// Update profile
export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user.id;
    const { name, email, phone, location, occupation, bio, socialLinks } = req.body;

    const updateData = {
      name,
      email,
      phone,
      location,
      position: occupation,
      bio,
      socialLinks,
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password -__v",
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Notify front-end if name changed
    const io = getIO();
    if (name && name !== req.user.name) {
      io.to(userId).emit("userNameUpdated", { userId, newName: name });
    }

    const profileData = {
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      location: updatedUser.location || "",
      occupation: updatedUser.position || "",
      joinDate: updatedUser.joinDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      bio: updatedUser.bio || "",
      socialLinks: {
        twitter: updatedUser.socialLinks?.twitter || "",
        github: updatedUser.socialLinks?.github || "",
        linkedin: updatedUser.socialLinks?.linkedin || "",
      },
      avatar: updatedUser.avatar
        ? {
          path: updatedUser.avatar.path,
          filename: updatedUser.avatar.filename,
          uploadedAt: updatedUser.avatar.uploadedAt
        }
        : { path: "", filename: "", uploadedAt: "" }
    };

    res.json(profileData);
  } catch (err) {
    console.error("Error in updateProfile:", err.message);
    next(err);
  }
};


export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Build public path for frontend to access
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Delete Old Avatar From Local Storage
    if (user.avatar?.path) {
      const oldFilePath = `.${user.avatar.path}`; // e.g. "./uploads/avatars/xyz.png"

      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Failed to delete old avatar:", err);
        }
      }
    }

    // Save New Avatar To Database
    user.avatar = {
      path: avatarUrl,          // "/uploads/avatars/file.png"
      filename: req.file.filename,
      uploadedAt: new Date(),
    };

    await user.save();

    return res.json({
      message: "Avatar updated successfully",
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return res.status(500).json({ error: "Failed to upload avatar" });
  }
};



export const getProfileById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profileData = {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      location: user.location || "",
      occupation: user.position || "",
      joinDate: user.joinDate?.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      bio: user.bio || "",
      socialLinks: {
        twitter: user.socialLinks?.twitter || "",
        github: user.socialLinks?.github || "",
        linkedin: user.socialLinks?.linkedin || "",
      },
      avatar: user.avatar || { public_id: "", url: "" },
    };

    res.json(profileData);
  } catch (err) {
    console.error("Error in getProfileById:", err.message);
    next(err);
  }
};
