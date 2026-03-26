import pino from "pino";
import { env } from "../env.js";

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
});
