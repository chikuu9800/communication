import express from "express";
import {
  createChannel,
  listChannels,
  updateChannel,
  deleteChannel,
} from "../controllers/channels.controller.js";

const router = express.Router();

router.post("/", createChannel);
router.get("/", listChannels);
router.patch("/:channelId", updateChannel);
router.delete("/:channelId", deleteChannel);

export default router;
