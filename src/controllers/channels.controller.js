import mongoose from "mongoose";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getIO } from "../services/socketio.service.js";
import crypto from "crypto";

// CREATE CHANNEL
// export const createChannel = async (req, res, next) => {
//   try {
//     const { type, name, users } = req.body;
//     const userId = req.user.id;

//     if (!type || !users || !Array.isArray(users)) {
//       return res.status(400).json({ error: "Type and users array are required" });
//     }

//     const validUsers = await User.find({ _id: { $in: users } }).select("_id name");
//     if (validUsers.length !== users.length) {
//       return res.status(400).json({ error: "Invalid user IDs" });
//     }

//     let channelData = {
//       type,
//       users: [...new Set([...users, userId])].map(
//         (id) => new mongoose.Types.ObjectId(id)
//       ),

//       lastMessageTime: new Date(),
//       unreadCounts: new Map(),
//     };

//     // DIRECT CHAT CASE
//     if (type === "direct") {
//       if (channelData.users.length !== 2) {
//         return res
//           .status(400)
//           .json({ error: "Direct chat requires exactly two participants" });
//       }

//       channelData.users.sort();
//       const otherUserId = channelData.users.find((id) => id.toString() !== userId);
//       const otherUser = validUsers.find(
//         (u) => u._id.toString() === otherUserId.toString()
//       );

//       channelData.name = name?.trim() || otherUser.name || "Direct Chat";

//       const existing = await Channel.findOne({
//         type: "direct",
//         users: { $all: channelData.users, $size: 2 },
//       });

//       // Direct channel exists
//       if (existing) {
//         const deletedAtObj = existing.deletedAt || {};

//         // User already has access
//         if (!deletedAtObj[userId]) {
//           return res.status(200).json({
//             message: "Direct chat exists",
//             channel: {
//               id: existing._id.toString(),
//               name: existing.name,
//               type: existing.type,
//               users: await Promise.all(
//                 existing.users.map(async (u) => {
//                   const user = await User.findById(u).select("name avatar");
//                   return {
//                     id: u.toString(),
//                     name: user.name,
//                     avatar: user.avatar?.url,
//                   };
//                 })
//               ),
//               lastMessage: existing.lastMessage || "",
//               lastMessageTime:
//                 existing.lastMessageTime || new Date().toISOString(),
//               unreadCount: existing.unreadCounts.get(userId) || 0,
//             },
//           });
//         }

//         // Reactivate chat
//         delete deletedAtObj[userId];
//         existing.deletedAt = deletedAtObj;
//         existing.lastMessageTime = new Date();
//         existing.unreadCounts.set(userId, 0);
//         await existing.save();

//         const io = getIO();
//         const populatedChannel = await Channel.findById(existing._id)
//           .populate("users", "name avatar")
//           .lean();

//         const formattedChannel = {
//           id: populatedChannel._id.toString(),
//           name: populatedChannel.name,
//           type: populatedChannel.type,
//           users: populatedChannel.users.map((u) => ({
//             id: u._id.toString(),
//             name: u.name,
//             avatar: u.avatar?.url,
//           })),
//           lastMessage: populatedChannel.lastMessage || "",
//           lastMessageTime:
//             populatedChannel.lastMessageTime || new Date().toISOString(),
//           unreadCount: populatedChannel.unreadCounts
//             ? populatedChannel.unreadCounts[userId] || 0
//             : 0,
//         };

//         existing.users.forEach((uid) => {
//           io.to(uid.toString()).emit("channelCreated", formattedChannel);
//         });

//         return res.status(200).json({
//           message: "Direct chat reactivated",
//           channel: formattedChannel,
//         });
//       }
//     } else {
//       // GROUP CHANNEL
//       if (!name?.trim()) {
//         return res.status(400).json({ error: "Group name is required" });
//       }

//       channelData.name = name.trim();
//       channelData.inviteToken = crypto.randomBytes(16).toString("hex");
//     }

//     const newChannel = new Channel(channelData);
//     await newChannel.save();

//     const populatedChannel = await Channel.findById(newChannel._id)
//       .populate("users", "name avatar")
//       .lean();

//     const formattedChannel = {
//       id: populatedChannel._id.toString(),
//       name: populatedChannel.name,
//       type: populatedChannel.type,
//       users: populatedChannel.users.map((u) => ({
//         id: u._id.toString(),
//         name: u.name,
//         avatar: u.avatar?.url,
//       })),
//       inviteToken: populatedChannel.inviteToken,
//       createdAt: populatedChannel.createdAt,
//       updatedAt: populatedChannel.updatedAt,
//       lastMessage: "",
//       lastMessageTime:
//         populatedChannel.lastMessageTime || new Date().toISOString(),
//       unreadCount: 0,
//     };

//     const io = getIO();
//     newChannel.users.forEach((uid) => {
//       io.to(uid.toString()).emit("channelCreated", formattedChannel);
//     });

//     return res
//       .status(201)
//       .json({ message: "Channel created", channel: formattedChannel });
//   } catch (err) {
//     next(err);
//   }
// };
// CREATE CHANNEL
export const createChannel = async (req, res, next) => {
  try {
    const { type, name, users } = req.body;
    const userId = req.user.id;

    if (!type || !users || !Array.isArray(users)) {
      return res.status(400).json({ error: "Type and users array are required" });
    }

    // 🔥 ALWAYS fetch real users from DB (the fix)
    const dbUsers = await User.find({ _id: { $in: users } })
      .select("_id name avatar");

    if (dbUsers.length !== users.length) {
      return res.status(400).json({ error: "Invalid user IDs" });
    }

    // Add creator
    const allUsers = [
      ...new Set([...dbUsers.map(u => u._id.toString()), userId])
    ].map(id => new mongoose.Types.ObjectId(id));

    let channelData = {
      type,
      users: allUsers,
      lastMessageTime: new Date(),
      unreadCounts: new Map(),
    };

    // DIRECT CHAT
    if (type === "direct") {
      if (allUsers.length !== 2) {
        return res.status(400).json({ error: "Direct chat needs 2 users" });
      }

      allUsers.sort();

      const otherUserId = allUsers.find(id => id.toString() !== userId);
      const otherUser = dbUsers.find(u => u._id.toString() === otherUserId.toString());

      channelData.name = name?.trim() || otherUser?.name || "Direct Chat";

      // Check existing chat
      const existing = await Channel.findOne({
        type: "direct",
        users: { $all: allUsers, $size: 2 }
      });

      // If exists (reactivation logic unchanged)
      if (existing) {
        const deletedAtObj = existing.deletedAt || {};

        if (!deletedAtObj[userId]) {
          const populated = await Channel.findById(existing._id)
            .populate("users", "name avatar")
            .lean();

          return res.status(200).json({
            message: "Direct chat exists",
            channel: formatChannel(populated, userId)
          });
        }

        delete deletedAtObj[userId];
        existing.deletedAt = deletedAtObj;
        existing.unreadCounts.set(userId, 0);
        existing.lastMessageTime = new Date();
        await existing.save();

        const populated = await Channel.findById(existing._id)
          .populate("users", "name avatar")
          .lean();

        return res.status(200).json({
          message: "Direct chat reactivated",
          channel: formatChannel(populated, userId)
        });
      }
    }

    // GROUP
    if (type === "group") {
      if (!name?.trim()) {
        return res.status(400).json({ error: "Group name is required" });
      }
      channelData.name = name.trim();
      channelData.inviteToken = crypto.randomBytes(16).toString("hex");
    }

    // CREATE CHANNEL
    const newChannel = await Channel.create(channelData);

    // 🔥 FIXED: populate works 100% because IDs are verified & valid
    const populated = await Channel.findById(newChannel._id)
      .populate("users", "name avatar")
      .lean();

    const formatted = formatChannel(populated, userId);

    // Emit to all users
    const io = getIO();
    allUsers.forEach(uid => io.to(uid.toString()).emit("channelCreated", formatted));

    return res.status(201).json({
      message: "Channel created",
      channel: formatted
    });

  } catch (err) {
    next(err);
  }
};

function formatChannel(populated, userId) {
  return {
    id: populated._id.toString(),
    name: populated.name,
    type: populated.type,
    users: populated.users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      avatar: u.avatar?.path,
    })),
    inviteToken: populated.inviteToken,
    createdAt: populated.createdAt,
    updatedAt: populated.updatedAt,
    lastMessage: populated.lastMessage || "",
    lastMessageTime: populated.lastMessageTime || new Date().toISOString(),
    unreadCount: populated.unreadCounts?.[userId] || 0,
  };
}

// LIST CHANNELS
export const listChannels = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const channels = await Channel.find({
      users: userId,
      $or: [
        { deletedAt: { $exists: false } },
        { [`deletedAt.${userId}`]: { $exists: false } },
      ],
    })
      .populate("users", "name avatar")
      .sort({ lastMessageTime: -1, updatedAt: -1 })
      .lean();

    const channelsWithDetails = await Promise.all(
      channels.map(async (channel) => {
        const lastMessage = await Message.findOne({ channelId: channel._id })
          .sort({ createdAt: -1 })
          .populate("user", "name avatar");

        return {
          id: channel._id.toString(),
          name:
            channel.type === "direct"
              ? channel.users.find((u) => u._id.toString() !== userId)?.name ||
              "Direct Chat"
              : channel.name,
          type: channel.type,
          users: channel.users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            avatar: u.avatar?.path,
          })),
          lastMessage: lastMessage?.text,
          lastMessageTime:
            lastMessage?.createdAt ||
            channel.lastMessageTime ||
            channel.updatedAt,
          unreadCount: channel.unreadCounts
            ? channel.unreadCounts[userId] || 0
            : 0,
          inviteToken: channel.inviteToken,
        };
      })
    );

    return res.json({ channels: channelsWithDetails });
  } catch (err) {
    console.error("Unhandled error:", err);
    next(err);
  }
};

// UPDATE CHANNEL
export const updateChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { name, users } = req.body;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res
        .status(404)
        .json({ error: "Channel not found or unauthorized" });
    }

    // OLD vs NEW users
    const oldUsers = channel.users.map(String);
    const newUsers =
      users && Array.isArray(users) ? [...new Set(users)] : oldUsers;

    if (users) {
      const validUsers = await User.find({ _id: { $in: newUsers } }).select(
        "_id"
      );
      if (validUsers.length !== newUsers.length) {
        return res.status(400).json({ error: "Invalid user IDs" });
      }
    }

    const added = newUsers.filter((id) => !oldUsers.includes(id));
    const removed = oldUsers.filter((id) => !newUsers.includes(id));

    if (name?.trim()) channel.name = name.trim();
    if (users) {
      channel.users = newUsers.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }


    channel.updatedAt = new Date();
    channel.lastMessageTime = new Date();

    await channel.save();

    const populatedChannel = await Channel.findById(channelId)
      .populate("users", "name avatar")
      .lean();

    const formattedChannel = {
      id: populatedChannel._id.toString(),
      name:
        populatedChannel.type === "direct"
          ? populatedChannel.users.find(
            (u) => u._id.toString() !== userId
          )?.name || "Direct Chat"
          : populatedChannel.name,
      type: populatedChannel.type,
      users: populatedChannel.users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar?.url,
      })),
      inviteToken: populatedChannel.inviteToken,
      createdAt: populatedChannel.createdAt,
      updatedAt: populatedChannel.updatedAt,
      lastMessageTime:
        populatedChannel.lastMessageTime || new Date().toISOString(),
      unreadCount: populatedChannel.unreadCounts
        ? populatedChannel.unreadCounts[userId] || 0
        : 0,
    };

    const io = getIO();
    channel.users.forEach((uid) => {
      io.to(uid.toString()).emit("channelUpdated", formattedChannel);
    });

    return res
      .status(200)
      .json({ message: "Channel updated", channel: formattedChannel });
  } catch (error) {
    next(error);
  }
};

// DELETE CHANNEL
export const deleteChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) {
      return res
        .status(404)
        .json({ error: "Channel not found or unauthorized" });
    }

    const users = channel.users.map(String);
    const deletedAtObj = channel.deletedAt || {};

    // DIRECT CHAT DELETE
    if (channel.type === "direct") {
      deletedAtObj[userId] = new Date();
      channel.deletedAt = deletedAtObj;
      channel.lastMessageTime = new Date();
      channel.unreadCounts.set(userId, 0);

      const bothDeleted = users.every((uid) => deletedAtObj[uid]);

      if (bothDeleted) {
        await channel.deleteOne();
      } else {
        await channel.save();
      }

      const io = getIO();
      const otherUser = users.find((uid) => uid !== userId);
      if (otherUser) {
        io.to(otherUser).emit("channelDeleted", { channelId, userId });
      }
      io.to(userId).emit("channelDeleted", { channelId, userId });

      return res.status(200).json({
        message: bothDeleted
          ? "Channel deleted for everyone"
          : "Direct chat deleted for you",
        channelId,
      });
    }

    // GROUP DELETE
    const remainingUsers = users.filter((uid) => uid !== userId);

    if (remainingUsers.length === 0) {
      await channel.deleteOne();
    } else {
      channel.users = remainingUsers;
      deletedAtObj[userId] = new Date();
      channel.deletedAt = deletedAtObj;
      channel.lastMessageTime = new Date();
      channel.unreadCounts.set(userId, 0);
      await channel.save();
    }

    const io = getIO();
    remainingUsers.forEach((uid) => {
      io.to(uid).emit("channelDeleted", { channelId, userId });
    });
    io.to(userId).emit("channelDeleted", { channelId, userId });

    return res.status(200).json({
      message:
        remainingUsers.length === 0
          ? "Channel deleted (no users left)"
          : "You left the group",
      channelId,
    });
  } catch (err) {
    next(err);
  }
};
