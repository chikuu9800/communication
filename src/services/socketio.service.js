import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import Message from "../models/Message.js";
import MessageReadReceipt from "../models/MessageReadReceipt.js";
import Channel from "../models/Channel.js";

let ioInstance = null;

export const setupSocketIO = async (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  ioInstance = io;

  // ===== JWT SOCKET AUTH =====
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error("Socket.IO: Token validation failed", err.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ===== SOCKET CONNECTION =====
  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.user.id} (${socket.id})`);

    // User private room
    socket.join(socket.user.id);

    // ===== JOIN CHANNEL =====
    socket.on("joinChat", async (channelId) => {
      const channel = await Channel.findOne({
        _id: channelId,
        users: socket.user.id,
      });

      if (!channel) {
        return socket.emit("error", { message: "Unauthorized channel" });
      }

      socket.join(channelId);
      console.log(`User ${socket.user.id} joined ${channelId}`);
    });

    // ===== LEAVE CHANNEL =====
    socket.on("leaveChat", (channelId) => {
      socket.leave(channelId);
      console.log(`User ${socket.user.id} left ${channelId}`);
    });

    // ===== SEND MESSAGE =====
    socket.on("sendMessage", async (message, callback) => {
      try {
        const channel = await Channel.findOne({
          _id: message.channelId,
          users: socket.user.id,
        });

        if (!channel) {
          if (typeof callback === "function")
            callback({ error: "Unauthorized" });
          return;
        }

        // attachments already contain: fileUrl, fileName, fileType, fileSize
        const savedAttachments = message.attachments || [];

        // Save message
        const newMessage = await Message.create({
          channelId: message.channelId,
          user: socket.user.id,
          text: message.content || (savedAttachments.length ? "📎 Attachment" : ""),
          attachments: savedAttachments,
          replyTo: message.replyTo || null,

        });

        // Update channel preview
        channel.lastMessage =
          message.content || (savedAttachments.length ? "📎 Attachment" : "");
        channel.lastMessageTime = new Date();

        channel.users.forEach((uid) => {
          if (uid.toString() !== socket.user.id) {
            const current =
              channel.unreadCounts?.get?.(uid.toString()) ??
              channel.unreadCounts?.[uid] ?? 0;

            if (channel.unreadCounts instanceof Map) {
              channel.unreadCounts.set(uid.toString(), current + 1);
            } else {
              channel.unreadCounts[uid] = current + 1;
            }
          }
        });

        await channel.save();

        const populatedMsg = await Message.findById(newMessage._id)
          .populate("user", "name avatar")
          .populate({
            path: "replyTo",
            populate: { path: "user", select: "name avatar" }
          });


        const formattedMessage = {
          id: populatedMsg._id.toString(),
          channelId: message.channelId,
          sender: {
            id: populatedMsg.user._id.toString(),
            name: populatedMsg.user.name,
            avatar: populatedMsg.user.avatar?.url,
          },
          content: populatedMsg.text,   // <-- correct
          attachments: populatedMsg.attachments || [],
          timestamp: populatedMsg.createdAt.toISOString(),
          status: "sent",

          replyTo: populatedMsg.replyTo
            ? {
              id: populatedMsg.replyTo._id.toString(),
              content: populatedMsg.replyTo.text,  // <-- matches `content`
              attachments: populatedMsg.replyTo.attachments || [],
              sender: {
                id: populatedMsg.replyTo.user._id.toString(),
                name: populatedMsg.replyTo.user.name,
                avatar: populatedMsg.replyTo.user.avatar?.url
              }
            }
            : null,
        };


        io.to(message.channelId).emit("receiveMessage", formattedMessage);

        if (callback) callback({ message: formattedMessage });

      } catch (err) {
        console.error("Socket sendMessage failed:", err);
        if (callback) callback({ error: "Failed to send message" });
      }
    });


    // ===== TYPING EVENT =====
    socket.on("typing", ({ channelId, isTyping }) => {
      socket.to(channelId).emit("typing", {
        userId: socket.user.id,
        name: socket.user.name,
        isTyping,
      });
    });

    // ===== MARK MESSAGE SEEN =====
    socket.on("markSeen", async ({ channelId, messageId }) => {
      await MessageReadReceipt.findOneAndUpdate(
        { messageId, userId: socket.user.id },
        { seenAt: new Date() },
        { upsert: true }
      );

      socket.to(channelId).emit("messageSeen", {
        messageId,
        userId: socket.user.id,
      });
    });

    // ===== DEBUG ALL EVENTS =====
    socket.onAny((event, data) => {
      console.log(`Event: ${event}`, data);
    });

    // ===== DISCONNECT =====
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized");
  }
  return ioInstance;
};



