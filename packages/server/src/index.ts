import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import projectsRouter from "./api/projects.js";
import tasksRouter from "./api/tasks.js";
import commentsRouter from "./api/comments.js";
import healthRouter from "./api/health.js";
import { closeDb } from "./db/index.js";
import { log, logRequest } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(port = 3333) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      // Skip logging for health checks
      if (req.path !== "/health" && req.path !== "/api/health") {
        logRequest(req.method, req.path, res.statusCode, duration);
      }
    });
    next();
  });

  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/health", healthRouter);

  const uiPath = join(__dirname, "../../ui/dist");
  if (existsSync(uiPath)) {
    app.use(express.static(uiPath));
    app.get("*", (_req, res) => {
      res.sendFile(join(uiPath, "index.html"));
    });
  }

  const server = app.listen(port, () => {
    log(`Server running on http://localhost:${port}`);
  });

  const shutdown = () => {
    log("Shutting down...");
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { app, server };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = parseInt(process.env.PORT || "3333", 10);
  createServer(port);
}

export { getDb } from "./db/index.js";
export * from "./types.js";
