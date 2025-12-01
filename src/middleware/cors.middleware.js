import cors from "cors";

const getAllowedOrigins = () => {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "https://communication.impmeet.com",
        "http://192.168.1.3:3000",
        "http://192.168.1.182:3000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://192.168.1.5:5173",
      ];
};

const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
