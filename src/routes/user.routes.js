import express from "express";
import {
  listUsers,
  getCurrentUser,
  getProfile,
  updateProfile,
  uploadAvatar,
  getProfileById,
} from "../controllers/user.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { multeruploadAvatar } from "../middleware/avtar.js";

const router = express.Router();

router.get("/", listUsers);
router.get("/me", authenticateToken, getCurrentUser);
router.get("/profile", authenticateToken, getProfile);
router.post("/profile", authenticateToken, updateProfile);
router.post("/avatar", authenticateToken, multeruploadAvatar.single("avatar"), uploadAvatar);
router.get("/profilebyid/:id", authenticateToken, getProfileById);

export default router;
