import path from "path";
import { fileURLToPath } from "url";

// __dirname FIX for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_DIR = path.join(__dirname, "../../uploads");

export const SALT_ROUNDS = 12;
export const JWT_EXPIRY = "1d";
export const JWT_REFRESH_EXPIRY = "7d";

export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 mins
export const RATE_LIMIT_MAX = 1000;

export const DB_TIMEZONE = "+00:00";
export const MAX_CONNECTION_ATTEMPTS = 5;

// For Web Push notifications
export const pushSubscriptions = [];
