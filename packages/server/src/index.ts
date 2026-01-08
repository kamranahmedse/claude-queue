import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Server } from "http";

import projectsRouter from "./api/projects.js";
import tasksRouter from "./api/tasks.js";
import commentsRouter from "./api/comments.js";
import templatesRouter from "./api/templates.js";
import healthRouter from "./api/health.js";
import maintenanceRouter from "./api/maintenance.js";
import { closeDb } from "./db/index.js";
import { log, logRequest } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(port = 3333): { app: Express; server: Server } {
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
  app.use("/api/templates", templatesRouter);
  app.use("/api/maintenance", maintenanceRouter);
  app.use("/health", healthRouter);

  // Find UI path - works for both npm package and development
  const uiPaths = [
    join(__dirname, "../ui"),        // npm package: dist/server/../ui = dist/ui
    join(__dirname, "../../ui/dist") // development: dist/../../ui/dist
  ];

  const uiPath = uiPaths.find((p) => existsSync(join(p, "index.html")));
  if (uiPath) {
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
