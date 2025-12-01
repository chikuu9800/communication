import "dotenv/config";
import express from "express";
import http from "http";
import fs from "fs";
import path from "path";

import connectMongoDB from "./src/config/mongo.js";
import { UPLOADS_DIR } from "./src/config/constants.js";

import { authenticateToken } from "./src/middleware/auth.middleware.js";
import corsMiddleware from "./src/middleware/cors.middleware.js";
import errorHandler from "./src/middleware/errorHandler.js";

import notificationRoutes from "./src/routes/notification.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import channelsRoutes from "./src/routes/channels.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import meetingRoutes from "./src/routes/meeting.routes.js";
import callRoutes from "./src/routes/call.routes.js";
import inviteRoutes from "./src/routes/invite.routes.js";

import { setupSocketIO } from "./src/services/socketio.service.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(corsMiddleware);
app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);



app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// PUBLIC
app.use("/", authRoutes);
app.use("/", notificationRoutes);
app.use("/users", userRoutes);
app.use("/invite", inviteRoutes);

// ⬇️ PUBLIC UPLOAD
app.use("/upload", uploadRoutes);

// PROTECTED
app.use(authenticateToken);

app.use("/message", messageRoutes);
app.use("/channels", channelsRoutes);
app.use("/meetings", meetingRoutes);
app.use("/call-history", callRoutes);

setupSocketIO(server);

app.use(errorHandler);

connectMongoDB();

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
