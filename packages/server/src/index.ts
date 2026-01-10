import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Server } from "http";
import { customAlphabet } from "nanoid";

import projectsRouter from "./api/projects.js";
import tasksRouter from "./api/tasks.js";
import commentsRouter from "./api/comments.js";
import templatesRouter from "./api/templates.js";
import attachmentsRouter from "./api/attachments.js";
import promptsRouter from "./api/prompts.js";
import healthRouter from "./api/health.js";
import maintenanceRouter from "./api/maintenance.js";
import { closeDb, getDb } from "./db/index.js";
import { log, logRequest } from "./logger.js";
import { seedDefaultTemplates } from "./api/projects.js";

const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureDevProject(): void {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects").all();

  if (projects.length === 0) {
    const projectRoot = process.env.DEV_PROJECT_ROOT || process.cwd();
    const name = projectRoot.split("/").pop() || "dev";
    const id = `kbn-${generateId()}`;

    db.prepare("INSERT INTO projects (id, path, name) VALUES (?, ?, ?)").run(id, projectRoot, name);
    seedDefaultTemplates(id);
    log(`Auto-created dev project: ${id} (${name})`);
  }
}

export function createServer(port = 3333): { app: Express; server: Server } {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      const isHealthCheck = req.path === "/health" || req.path === "/api/health";
      if (!isHealthCheck) {
        logRequest(req.method, req.path, res.statusCode, duration);
      }
    });
    next();
  });

  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/prompts", promptsRouter);
  app.use("/api/maintenance", maintenanceRouter);
  app.use("/health", healthRouter);

  const isDev = process.env.NODE_ENV === "development";
  const viteDevPort = process.env.VITE_DEV_PORT || "5173";

  if (isDev) {
    app.use(
      createProxyMiddleware({
        target: `http://localhost:${viteDevPort}`,
        changeOrigin: true,
        ws: true,
      })
    );
  } else {
    const uiPaths = [
      join(__dirname, "../ui"),        // npm package: dist/server/../ui = dist/ui
      join(__dirname, "../../ui/dist") // development: dist/../../ui/dist
    ];

    const uiPath = uiPaths.find((p) => existsSync(join(p, "index.html")));
    if (uiPath) {
      const indexPath = join(uiPath, "index.html");

      // Allow dotfiles since npm cache uses .npm folder
      app.use(express.static(uiPath, { dotfiles: "allow" }));
      app.get("/{*splat}", (_req, res) => {
        res.sendFile(indexPath, { dotfiles: "allow" }, (err) => {
          if (err && !res.headersSent) {
            res.status(404).send("Not found");
          }
        });
      });
    } else {
      log(`Warning: UI not found. Checked paths: ${uiPaths.join(", ")}`);
    }
  }

  const server = app.listen(port, () => {
    log(`Server running on http://localhost:${port}`);

    if (isDev) {
      ensureDevProject();
    }
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
