import { Router } from "express";
import { createReadStream, existsSync, statSync } from "fs";
import { watch } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createInterface } from "readline";

const router = Router();
const LOG_FILE = join(homedir(), ".claude-kanban", "server.log");

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!existsSync(LOG_FILE)) {
    res.write(`data: ${JSON.stringify({ type: "info", message: "No log file yet" })}\n\n`);
  }

  let lastSize = existsSync(LOG_FILE) ? statSync(LOG_FILE).size : 0;
  const initialLines = parseInt(req.query.lines as string) || 50;

  const sendInitialLines = () => {
    if (!existsSync(LOG_FILE)) {
      return;
    }

    const lines: string[] = [];
    const stream = createReadStream(LOG_FILE, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      lines.push(line);
      if (lines.length > initialLines) {
        lines.shift();
      }
    });

    rl.on("close", () => {
      for (const line of lines) {
        res.write(`data: ${JSON.stringify({ type: "log", content: line })}\n\n`);
      }
    });
  };

  sendInitialLines();

  const sendNewLines = () => {
    if (!existsSync(LOG_FILE)) {
      return;
    }

    const currentSize = statSync(LOG_FILE).size;

    if (currentSize < lastSize) {
      lastSize = 0;
    }

    if (currentSize > lastSize) {
      const stream = createReadStream(LOG_FILE, {
        encoding: "utf-8",
        start: lastSize,
        end: currentSize - 1,
      });

      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      rl.on("line", (line) => {
        res.write(`data: ${JSON.stringify({ type: "log", content: line })}\n\n`);
      });

      rl.on("close", () => {
        lastSize = currentSize;
      });
    }
  };

  const watcher = watch(join(homedir(), ".claude-kanban"), { persistent: true }, (eventType, filename) => {
    if (filename === "server.log") {
      sendNewLines();
    }
  });

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    watcher.close();
    clearInterval(heartbeat);
  });
});

router.get("/recent", (req, res) => {
  const lines = parseInt(req.query.lines as string) || 100;

  if (!existsSync(LOG_FILE)) {
    res.json({ logs: [], message: "No log file yet" });
    return;
  }

  const result: string[] = [];
  const stream = createReadStream(LOG_FILE, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  rl.on("line", (line) => {
    result.push(line);
    if (result.length > lines) {
      result.shift();
    }
  });

  rl.on("close", () => {
    res.json({ logs: result });
  });

  rl.on("error", (err) => {
    res.status(500).json({ error: err.message });
  });
});

export default router;
