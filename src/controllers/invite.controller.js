import { generateInviteToken } from "../utils/tokenGenerator.js";
import Channel from "../models/Channel.js";

export const generateInviteLink = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Generate token only if missing
    if (!channel.inviteToken) {
      channel.inviteToken = generateInviteToken(channelId);
      await channel.save();
    }

    const baseUrl =
      process.env.PUBLIC_URL ||
      `${req.protocol}://${req.get("host")}`;

    const inviteLink = `${baseUrl}/invite/${channel.inviteToken}`;

    res.json({ link: inviteLink });
  } catch (err) {
    next(err);
  }
};

export const regenerateInviteLink = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Always generate new invite
    channel.inviteToken = generateInviteToken(channelId);
    await channel.save();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${channel.inviteToken}`;

    res.json({ link: inviteLink });
  } catch (err) {
    next(err);
  }
};

export const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findOne({ inviteToken: token });

    if (!channel) {
      return res
        .status(404)
        .json({ error: "Invalid or expired invite link" });
    }

    // Add user only if not already joined
    if (!channel.users.includes(userId)) {
      channel.users.push(userId);
      await channel.save();
    }

    res.status(200).json({
      message: "You have joined the channel",
      channelId: channel._id,
    });
  } catch (err) {
    next(err);
  }
};
