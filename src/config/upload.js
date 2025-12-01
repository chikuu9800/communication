import multer from "multer";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "./constants.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  // Whitelist of known-good MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/mpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/x-log",
    "application/json",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed", // some browsers/clients
    "application/x-7z-compressed",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/x-bzip",
    "application/x-bzip2",
    "application/x-gzip",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  // Explicitly allow .log and .zip (regardless of MIME sniffing)
  if (ext === ".log" || ext === ".zip") {
    return cb(null, true);
  }

  // Fallback to MIME type check
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  console.warn("🚫 Rejected upload:", file.originalname, file.mimetype, ext);
  cb(new Error("File type not allowed"), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export default upload;
