import express from "express";
import { addSubscription } from "../services/notification.service.js"; 
// ⬆️ You can adjust this path if needed

const router = express.Router();

// =======================================
// 🔔 Push Notification Subscription
// =======================================
router.post("/subscribe", (req, res) => {
  const { userId, ...subscription } = req.body;

  if (!userId || !subscription.endpoint) {
    return res.status(400).json({ error: "Invalid subscription" });
  }

  addSubscription(userId, subscription);

  res.status(201).json({ message: "Subscription saved" });
});

export default router;
