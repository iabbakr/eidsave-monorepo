import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectRedis, disconnectRedis } from "./lib/redis.js";
import { startJobs } from "./jobs/index.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

connectRedis();

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

startJobs();

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await disconnectRedis();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
