import express from "express";
import { getCallHistory } from "../controllers/call.controller.js";

const router = express.Router();

router.get("/", getCallHistory);

export default router;
