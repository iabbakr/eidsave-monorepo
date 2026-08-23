import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { notFound, errorHandler } from "./middlewares/error.js";
import { captureRawBody, attachParsedBody } from "./lib/webhookRawBody.js";
import { WebhookController } from "./controllers/webhook.controller.js";

const app: Express = express();

app.set("trust proxy", 1);

// List of allowed web origins (Admin web, preview deployments, local dev)
const defaultAllowedOrigins = [
  "http://localhost:5173", // Vite Admin local
  "http://localhost:8081", // Expo Web local (if tested in browser)
  "http://localhost:3000",
  "http://localhost:5001",
  "https://eidsave-monorepo.onrender.com",
];

const envAllowedOrigins = process.env["ALLOWED_ORIGINS"]
  ? process.env["ALLOWED_ORIGINS"].split(",").map((o) => o.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. Expo native mobile, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Optional: Allow Vercel preview domains if hosting admin on Vercel
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Paystack webhook — MUST be mounted before express.json() below.
//
// Paystack's HMAC signature is computed over the exact raw bytes it sent. If
// express.json() parses the body first, the stream is consumed and cannot be
// re-read here, and any attempt to re-derive the "raw" body via
// JSON.stringify(parsedBody) will not byte-match the original payload
// (different key order/whitespace), which silently breaks verification.
// Registering this route directly on `app` — ahead of the global JSON
// parser — means it fully handles and responds to the request before
// execution would otherwise reach express.json() or the main router.
// ---------------------------------------------------------------------------
app.post(
  "/api/v1/webhooks/paystack",
  captureRawBody,
  attachParsedBody,
  WebhookController.paystack,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later", success: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later", success: false },
});

app.use("/api", limiter);
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

app.use("/api", router);

app.use(notFound);
app.use(errorHandler);

export default app;