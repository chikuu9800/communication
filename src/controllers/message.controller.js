// backend/src/controllers/message.controller.js
import fs from "fs";
import path from "path";
import Message from "../models/Message.js";
import MessageReadReceipt from "../models/MessageReadReceipt.js";
import Channel from "../models/Channel.js";
import { getIO } from "../services/socketio.service.js";

function getUnreadCount(unreadCounts, userId) {
  if (!unreadCounts) return 0;
  const key = userId.toString();
  if (unreadCounts instanceof Map) return unreadCounts.get(key) ?? 0;
  if (typeof unreadCounts === "object") return unreadCounts[key] ?? 0;
  return 0;
}


// export const sendMessage = async (req, res) => {
//   try {
//     const { channelId, text, replyTo, forwardedFrom } = req.body;
//     const userId = req.user.id;

//     // 1. Validate channel and membership
//     const channel = await Channel.findOne({ _id: channelId, users: userId });
//     if (!channel)
//       return res.status(403).json({ error: "User not authorized for this channel" });

//     // 2. Ensure uploads directory exists
//     const uploadDir = path.join(process.cwd(), "uploads");
//     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

//     // 3. Process uploaded files
//     const savedAttachments = [];

//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {

//         // Generate clean safe filename
//         const ext = path.extname(file.originalname);
//         const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
//         const savePath = path.join(uploadDir, uniqueName);

//         // Save file buffer to disk
//         fs.writeFileSync(savePath, file.buffer);

//         savedAttachments.push({
//           fileUrl: `/uploads/${uniqueName}`,
//           fileName: file.originalname,
//           fileType: file.mimetype,
//           fileSize: file.size,
//         });
//       }
//     }

//     const isAttachmentOnly = (!text || !text.trim()) && savedAttachments.length > 0;

//     // 4. Create message in DB
//     const message = await Message.create({
//       channelId,
//       user: userId,
//       text: text?.trim() || (isAttachmentOnly ? "📎 Attachment" : ""),
//       replyTo: replyTo || null,
//       forwardedFrom: forwardedFrom || null,
//       attachments: populated.attachments,
//     });

//     // 5. Update channel metadata
//     channel.lastMessage = message.text;
//     channel.lastMessageTime = new Date();

//     // Ensure unreadCounts is an object
//     if (!channel.unreadCounts || typeof channel.unreadCounts !== "object") {
//       channel.unreadCounts = {};
//     }

//     channel.users.forEach((uid) => {
//       const uidStr = uid.toString();
//       if (uidStr !== userId) {
//         channel.unreadCounts[uidStr] = (channel.unreadCounts[uidStr] || 0) + 1;
//       }
//     });

//     await channel.save();

//     // 6. Populate user for frontend response
//     const populated = await Message.findById(message._id).populate(
//       "user",
//       "name avatar"
//     );

//     const formattedMessage = {
//       id: message._id.toString(),
//       channelId,
//       sender: {
//         id: populated.user._id.toString(),
//         name: populated.user.name,
//         avatar: populated.user.avatar?.url,
//       },
//       content: message.text,
//       attachments: savedAttachments,
//       timestamp: message.createdAt.toISOString(),
//       status: "sent",
//     };

//     // 7. Broadcast message to channel
//     const io = getIO();
//     io.to(channelId).emit("receiveMessage", formattedMessage);

//     return res.status(201).json(formattedMessage);
//   } catch (err) {
//     console.error("Error sending message:", err);
//     return res.status(500).json({ error: "Failed to send message" });
//   }
// };

export const sendMessage = async (req, res) => {
  try {
    const { channelId, text, replyTo, forwardedFrom } = req.body;
    const userId = req.user.id;

    // 1. Validate channel membership
    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel)
      return res.status(403).json({ error: "User not authorized for this channel" });

    // 2. Ensure MESSAGE upload directory exists
    const messageUploadDir = path.join(process.cwd(), "uploads/messages");
    if (!fs.existsSync(messageUploadDir)) {
      fs.mkdirSync(messageUploadDir, { recursive: true });
    }

    // 3. Save uploaded files from multer (req.files)
    const savedAttachments = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const uniqueName = file.filename; // multer already saved file
        const fileUrl = `/uploads/messages/${uniqueName}`;

        savedAttachments.push({
          fileUrl,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
        });
      });
    }

    const isAttachmentOnly = (!text || !text.trim()) && savedAttachments.length > 0;

    // 4. Create message record
    const message = await Message.create({
      channelId,
      user: userId,
      text: text?.trim() || "",   // 👈 always empty if no text
      replyTo: replyTo || null,
      forwardedFrom: forwardedFrom || null,
      attachments: savedAttachments,
    });


    // 5. Update channel preview + unread counts
    channel.lastMessage = message.text;
    channel.lastMessageTime = new Date();

    if (!channel.unreadCounts || typeof channel.unreadCounts !== "object") {
      channel.unreadCounts = {};
    }

    channel.users.forEach((uid) => {
      const uidStr = uid.toString();
      if (uidStr !== userId) {
        channel.unreadCounts[uidStr] = (channel.unreadCounts[uidStr] || 0) + 1;
      }
    });

    await channel.save();

    // 6. Populate sender
    const populated = await Message.findById(message._id).populate(
      "user",
      "name avatar"
    );

    // 7. Format attachments for frontend
    const formattedAttachments = savedAttachments.map((a) => ({
      id: Date.now() + Math.random(),
      url: a.fileUrl,
      name: a.fileName,
      type: a.fileType.startsWith("image") ? "image" : "file",
      size: a.fileSize,
    }));

    // 8. Final formatted message for frontend
    const formattedMessage = {
      id: message._id.toString(),
      channelId,
      sender: {
        id: populated.user._id.toString(),
        name: populated.user.name,
        avatar: populated.user.avatar?.path, // correct avatar path
      },
      content: message.text,
      attachments: formattedAttachments,
      timestamp: message.createdAt.toISOString(),
      status: "sent",
    };

    // 9. Emit socket event
    const io = getIO();
    io.to(channelId).emit("receiveMessage", formattedMessage);

    return res.status(201).json(formattedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};




export const fetchMessages = async (req, res) => {
  try {
    const { channelId } = req.query;
    const userId = req.user.id;

    const channel = await Channel.findOne({ _id: channelId, users: userId });
    if (!channel) return res.status(403).json({ error: "User not authorized for this channel" });

    const messages = await Message.find({ channelId })
      .populate("user", "name avatar")
      .sort({ createdAt: 1 });

    const receipts = await MessageReadReceipt.find({
      userId,
      messageId: { $in: messages.map(m => m._id) },
    });

    const messagesWithStatus = messages.map(message => ({
      id: message._id.toString(),
      channelId: message.channelId.toString(),
      sender: {
        id: message.user._id.toString(),
        name: message.user.name,
        avatar: message.user.avatar?.path,
      },
      content: message.text,
      timestamp: message.createdAt.toISOString(),
      status: message.status,
      isCurrentUser: message.user._id.toString() === userId,
      replyTo: message.replyTo,
      forwardedFrom: message.forwardedFrom,

      // 🔥 FIX: return attachments too!
      attachments: message.attachments?.map(a => ({
        id: a._id?.toString() || Math.random().toString(36),
        type: a.fileType.startsWith("image/") ? "image" : "file",
        name: a.fileName,
        url: a.fileUrl,
        size: a.fileSize,
      })),

      seenBy: receipts
        .filter(r => r.messageId.toString() === message._id.toString())
        .map(r => r.userId.toString()),
    }));



    // Reset unread for this user (user opened the chat)
    if (channel.unreadCounts instanceof Map) {
      channel.unreadCounts.set(userId.toString(), 0);
    } else {
      channel.unreadCounts[userId] = 0;
    }
    await channel.save();

    const io = getIO();

    const populatedChannel = await Channel.findById(channelId)
      .populate("users", "name avatar")
      .lean();

    // Notify all users about updated unread counts
    (populatedChannel.users || []).forEach(u => {
      const unread = getUnreadCount(populatedChannel.unreadCounts, u._id);
      io.to(u._id.toString()).emit("channelUpdated", {
        id: populatedChannel._id.toString(),
        name: populatedChannel.name,
        type: populatedChannel.type,
        users: populatedChannel.users.map(x => ({
          id: x._id.toString(),
          name: x.name,
          avatar: x.avatar?.path,
        })),
        lastMessage: populatedChannel.lastMessage,
        lastMessageTime: populatedChannel.lastMessageTime?.toISOString(),
        unreadCount: unread,
      });
    });

    return res.json(messagesWithStatus);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// export const fetchMessages = async (req, res) => {
//   try {
//     const { channelId } = req.query;
//     const userId = req.user.id;

//     const channel = await Channel.findOne({ _id: channelId, users: userId });
//     if (!channel)
//       return res.status(403).json({ error: "User not authorized for this channel" });

//     //-----------------------------------------
//     // 1️⃣ Get all users in channel & fetch full user docs
//     //-----------------------------------------
//     const channelUsers = await User.find({
//       _id: { $in: channel.users }
//     }).select("name avatar");

//     // Build map: userId → { name, avatarPath }
//     const userMap = {};
//     channelUsers.forEach(u => {
//       userMap[u._id.toString()] = {
//         name: u.name,
//         avatar: u.avatar?.path || null,
//       };
//     });

//     //-----------------------------------------
//     // 2️⃣ Get messages
//     //-----------------------------------------
//     const messages = await Message.find({ channelId })
//       .sort({ createdAt: 1 });

//     const receipts = await MessageReadReceipt.find({
//       userId,
//       messageId: { $in: messages.map(m => m._id) },
//     });

//     //-----------------------------------------
//     // 3️⃣ Build final messages with sender info pulled from userMap
//     //-----------------------------------------
//     const messagesWithStatus = messages.map(message => {
//       const senderId = message.user.toString();
//       const senderInfo = userMap[senderId] || {};

//       return {
//         id: message._id.toString(),
//         channelId: message.channelId.toString(),

//         sender: {
//           id: senderId,
//           name: senderInfo.name || "Unknown",
//           avatar: senderInfo.avatar || null,    // 👈 ALWAYS CORRECT NOW
//         },

//         content: message.text,
//         timestamp: message.createdAt.toISOString(),
//         status: message.status,
//         isCurrentUser: senderId === userId,

//         replyTo: message.replyTo,
//         forwardedFrom: message.forwardedFrom,

//         attachments: message.attachments?.map(a => ({
//           id: a._id?.toString() || Math.random().toString(36),
//           type: a.fileType.startsWith("image/") ? "image" : "file",
//           name: a.fileName,
//           url: a.fileUrl,
//           size: a.fileSize,
//         })),

//         seenBy: receipts
//           .filter(r => r.messageId.toString() === message._id.toString())
//           .map(r => r.userId.toString()),
//       };
//     });

//     //-----------------------------------------
//     // 4️⃣ Reset unread count
//     //-----------------------------------------
//     if (channel.unreadCounts instanceof Map)
//       channel.unreadCounts.set(userId.toString(), 0);
//     else
//       channel.unreadCounts[userId] = 0;

//     await channel.save();

//     //-----------------------------------------
//     // 5️⃣ Notify all channel users
//     //-----------------------------------------
//     const io = getIO();
//     channelUsers.forEach(u => {
//       const unread = getUnreadCount(channel.unreadCounts, u._id);
//       io.to(u._id.toString()).emit("channelUpdated", {
//         id: channel._id.toString(),
//         name: channel.name,
//         type: channel.type,
//         users: channelUsers.map(x => ({
//           id: x._id.toString(),
//           name: x.name,
//           avatar: x.avatar?.path || null,
//         })),
//         lastMessage: channel.lastMessage,
//         lastMessageTime: channel.lastMessageTime?.toISOString(),
//         unreadCount: unread,
//       });
//     });

//     return res.json(messagesWithStatus);
//   } catch (error) {
//     console.error("Error fetching messages:", error);
//     return res.status(500).json({ error: "Failed to fetch messages" });
//   }
// };

export const markSeen = async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const channel = await Channel.findOne({ _id: message.channelId, users: userId });
    if (!channel) return res.status(403).json({ error: "User not authorized" });

    await MessageReadReceipt.findOneAndUpdate(
      { messageId, userId },
      { seenAt: new Date() },
      { upsert: true }
    );

    // Update message status when everyone else has seen it
    const receipts = await MessageReadReceipt.countDocuments({ messageId });
    const channelDoc = await Channel.findById(message.channelId).select("users").lean();
    if (channelDoc && receipts === (channelDoc.users.length - 1)) {
      await Message.findByIdAndUpdate(messageId, { status: "seen" });
    }

    // Emit messageSeen to channel
    const io = getIO();
    io.to(message.channelId).emit("messageSeen", { messageId, userId });

    return res.json({ message: "Message marked as seen" });
  } catch (error) {
    console.error("Error marking message as seen:", error);
    return res.status(500).json({ error: "Failed to mark message as seen" });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message)
      return res.status(404).json({ error: "Message not found" });

    // Only owner can delete their message
    if (message.user.toString() !== userId)
      return res.status(403).json({ error: "Not allowed to delete this message" });

    const channel = await Channel.findOne({ _id: message.channelId, users: userId });
    if (!channel)
      return res.status(403).json({ error: "User not authorized" });

    // Delete attachments from disk
    if (message.attachments?.length > 0) {
      for (const att of message.attachments) {
        try {
          const filePath = path.join(process.cwd(), att.fileUrl);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Failed to delete file:", e.message);
        }
      }
    }

    // Delete message
    await Message.findByIdAndDelete(messageId);

    // Update lastMessage and lastMessageTime (fetch latest message)
    const latestMsg = await Message.findOne({ channelId: message.channelId })
      .sort({ createdAt: -1 });

    if (latestMsg) {
      channel.lastMessage = latestMsg.text;
      channel.lastMessageTime = latestMsg.createdAt;
    } else {
      channel.lastMessage = "";
      channel.lastMessageTime = null;
    }

    await channel.save();

    // Emit socket event
    const io = getIO();
    io.to(message.channelId.toString()).emit("messageDeleted", {
      messageId,
      channelId: message.channelId.toString(),
    });

    return res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Failed to delete message" });
  }
};


export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText } = req.body;
    const userId = req.user.id;

    if (!newText || !newText.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const message = await Message.findById(messageId);
    if (!message)
      return res.status(404).json({ error: "Message not found" });

    if (message.user.toString() !== userId)
      return res.status(403).json({ error: "Not allowed to edit this message" });

    message.text = newText.trim();
    message.isEdited = true;
    await message.save();

    const channel = await Channel.findById(message.channelId);

    // Update channel preview if this is the latest message
    const latestMsg = await Message.findOne({ channelId: message.channelId })
      .sort({ createdAt: -1 });

    if (latestMsg._id.toString() === messageId) {
      channel.lastMessage = newText.trim();
      await channel.save();
    }

    const io = getIO();
    io.to(message.channelId.toString()).emit("messageUpdated", {
      messageId,
      newText: message.text,
      isEdited: true,
    });

    return res.json({
      success: true,
      message: "Message updated",
      updatedMessage: {
        id: messageId,
        content: message.text,
        isEdited: true,
      }
    });

  } catch (error) {
    console.error("Error editing message:", error);
    return res.status(500).json({ error: "Failed to edit message" });
  }
};


export const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetChannelId } = req.body;
    const userId = req.user.id;

    // Fetch original
    const original = await Message.findById(messageId).populate("user", "name");
    if (!original) return res.status(404).json({ error: "Original message not found" });

    // Validate target channel
    const channel = await Channel.findOne({ _id: targetChannelId, users: userId });
    if (!channel)
      return res.status(403).json({ error: "User not authorized for this channel" });

    // Create forwarded copy
    const newMessage = await Message.create({
      channelId: targetChannelId,
      user: userId,
      text: original.text,
      replyTo: null,
      forwardedFrom: original.user.name,
      attachments: original.attachments
    });

    // Socket emit
    const io = getIO();
    io.to(targetChannelId).emit("receiveMessage", {
      id: newMessage._id.toString(),
      channelId: targetChannelId,
      content: newMessage.text,
      forwardedFrom: original.user.name,
      attachments: original.attachments,
      timestamp: newMessage.createdAt.toISOString(),
      sender: {
        id: userId,
        name: req.user.name,
        avatar: req.user.avatar
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Forward error:", err);
    return res.status(500).json({ error: "Failed to forward message" });
  }
};
