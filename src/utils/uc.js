import mongoose from "mongoose";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";

async function migrateUnreadCounts() {
  try {
    await mongoose.connect(
      "mongodb+srv://adityajadhav97349:kingmaker007@cluster0.dgnw7jp.mongodb.net/impmeet?retryWrites=true&w=majority&appName=Cluster0"
    );

    const channels = await Channel.find({});

    for (const channel of channels) {
      const unreadCounts = new Map();

      for (const userId of channel.users) {
        const count = await Message.countDocuments({
          channelId: channel._id,
          status: "sent",
          user: { $ne: userId },
        });

        unreadCounts.set(userId.toString(), count);
      }

      channel.unreadCounts = unreadCounts;
      await channel.save();
    }

    console.log("✔ Migration completed successfully");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateUnreadCounts();
