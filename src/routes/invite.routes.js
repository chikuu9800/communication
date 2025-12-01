import express from "express";
import {
  generateInviteLink,
  regenerateInviteLink,
  acceptInvite,
} from "../controllers/invite.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// 🔓 Public Routes
router.get("/channels/:channelId/invite-link", generateInviteLink);
router.post("/channels/:channelId/invite-link/regenerate", regenerateInviteLink);

// 🔐 Protected Route
router.post("/:token/accept", authenticateToken, acceptInvite);

export default router;
