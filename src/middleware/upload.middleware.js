import multer from "multer";
import fs from "fs";
import path from "path";

const messageDir = "uploads/messages";
if (!fs.existsSync(messageDir)) {
  fs.mkdirSync(messageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, messageDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/; // allow documents if needed
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error("Message file type not allowed"));
};

export const uploadMessageFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // allow bigger message files
  fileFilter,
});
