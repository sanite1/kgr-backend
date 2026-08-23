process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  // Give the logger a moment to flush, then exit with failure code.
  // Uncaught exceptions leave the process in an undefined state -
  // it is NOT safe to continue.
  setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (reason, _promise) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const code = (reason as NodeJS.ErrnoException)?.code;

  const RECOVERABLE_CODES = [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EPIPE",
    "EAI_AGAIN",
    "EADDRNOTAVAIL",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "ENOTFOUND",
    "ECONNABORTED",
    "ERR_SOCKET_CONNECTION_TIMEOUT",
  ];

  const isRecoverable =
    (code && RECOVERABLE_CODES.includes(code)) ||
    RECOVERABLE_CODES.some((c) => message.includes(c));

  if (isRecoverable) {
    console.error(
      `UNHANDLED REJECTION (recoverable: ${code || "no code"}):`,
      message,
    );
    return;
  }

  console.error("UNHANDLED REJECTION (non-recoverable):", reason);
  setTimeout(() => process.exit(1), 1000);
});

import express from "express";
import dotenv from "dotenv";
dotenv.config();
// registers the global mongoose safety net; must run before models compile
import "./config/mongoosePlugins";
import cors from "cors";
import { connectDb } from "./config/db";
import { connectRedis } from "./config/redis";
import { validateEnv } from "./config/validateEnv";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { rateLimiter } from "./middlewares/rateLimiter";
import ApiError from "./errors/apiError";
import logger from "./config/logger";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import contactRoutes from "./routes/contact.routes";
import busRoutes from "./routes/bus.routes";
import tripPriceRoutes from "./routes/tripPrice.routes";
import receiptRoutes from "./routes/receipt.routes";
import paymentRoutes from "./routes/payment.routes";
import inventoryRoutes from "./routes/inventory.routes";
import partRequestRoutes from "./routes/partRequest.routes";
import batteryRoutes from "./routes/battery.routes";
import batteryExitFormRoutes from "./routes/batteryExitForm.routes";
import batteryAttendanceRoutes from "./routes/batteryAttendance.routes";
import batteryClosingRoutes from "./routes/batteryClosing.routes";
import houseClosingRoutes from "./routes/houseClosing.routes";
import mainYardClosingRoutes from "./routes/mainYardClosing.routes";
import ubsClosingRoutes from "./routes/ubsClosing.routes";
import batterySwapRoutes from "./routes/batterySwap.routes";
import repairRoutes from "./routes/repair.routes";
import reportRoutes from "./routes/report.routes";
import expenditureRoutes from "./routes/expenditure.routes";
import conversionRoutes from "./routes/conversion.routes";
import trackerReportRoutes from "./routes/trackerReport.routes";
import trackerRoutes from "./routes/tracker.routes";
import hijetRoutes from "./routes/hijet.routes";
import financeRoutes from "./routes/finance.routes";
import partnershipRoutes from "./routes/partnership.routes";
import gatePassRoutes from "./routes/gatePass.routes";
import purchaseRoutes from "./routes/purchase.routes";
import checklistRoutes from "./routes/checklist.routes";
import warehouseRoutes from "./routes/warehouse.routes";
import priceListRoutes from "./routes/priceList.routes";
import todoRoutes from "./routes/todo.routes";
import { createServer } from "http";
import { initSocket } from "./config/socket";
import { registerSocketHandlers } from "./config/socketHandler";

// Validate environment variables
validateEnv();

const PORT = process.env.PORT || 4000;
const app = express();

// Behind a managed host or reverse proxy (Render, Railway, nginx...),
// trust the first proxy hop so req.ip is the real client, not the proxy.
// Without this, IP-based rate limiting buckets every user together.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Webhook raw-body parsers (e.g. payment providers) go HERE,
//    BEFORE express.json(), when webhooks are added

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOption = {
  origin: (
    origin: string | undefined,
    cb: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn(`[CORS] Rejected origin: ${origin}`);
    return cb(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};
app.use(cors(corsOption));

// Request logging
app.use(requestLogger);

// Global IP rate limiting
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 1000;
const RATE_LIMIT_WINDOW_MS =
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000;
app.use(rateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS));

// Connect databases
connectDb();
connectRedis();

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "kgr-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Route mounting (prefix lives ONLY here)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/trip-price", tripPriceRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/requests", partRequestRoutes);
app.use("/api/batteries", batteryRoutes);
app.use("/api/battery-forms", batteryExitFormRoutes);
app.use("/api/battery-attendance", batteryAttendanceRoutes);
app.use("/api/battery-closing", batteryClosingRoutes);
app.use("/api/house-closing", houseClosingRoutes);
app.use("/api/main-yard-closing", mainYardClosingRoutes);
app.use("/api/ubs-closing", ubsClosingRoutes);
app.use("/api/battery-swaps", batterySwapRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/expenditures", expenditureRoutes);
app.use("/api/conversions", conversionRoutes);
app.use("/api/tracker-reports", trackerReportRoutes);
app.use("/api/trackers", trackerRoutes);
app.use("/api/hijet", hijetRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/partnerships", partnershipRoutes);
app.use("/api/gate-passes", gatePassRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/price-list", priceListRoutes);
app.use("/api/todos", todoRoutes);

// 404 handler (funnels into the error pipeline)
app.all("*", (req, _res, next) => {
  next(new ApiError(404, `Can't find ${req.originalUrl} on the server!`));
});

// Global error handler: MUST be last
app.use(globalErrorHandler);

// HTTP server + Socket.IO share one server
const httpServer = createServer(app);

const startServer = async () => {
  try {
    const io = await initSocket(httpServer);
    registerSocketHandlers(io);
    httpServer.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("Socket.IO ready");
    });
  } catch (err) {
    logger.error("Failed to start server", {
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
};

startServer();
