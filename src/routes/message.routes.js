import express from "express";
import {
  sendMessage,
  markSeen,
  fetchMessages,
  editMessage,
} from "../controllers/message.controller.js";
import { uploadMessageFile } from "../middleware/upload.middleware.js";  // <-- your multer file
import { deleteMessage } from "../controllers/message.controller.js";


const router = express.Router();


// Send a message
router.post("/", uploadMessageFile.array("files"), sendMessage);

// Mark a message as seen
router.patch("/seen", markSeen);

// Fetch messages for a channel
router.get("/messages", fetchMessages);

router.put("/edit/:messageId", editMessage);

router.delete("/delete/:messageId", deleteMessage);

export default router;
