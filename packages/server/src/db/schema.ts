import type Database from "better-sqlite3";

export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      paused INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const projectColumns = db.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
  const hasPausedColumn = projectColumns.some((col) => col.name === "paused");
  if (!hasPausedColumn) {
    db.exec("ALTER TABLE projects ADD COLUMN paused INTEGER DEFAULT 0");
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      blocked INTEGER DEFAULT 0,
      current_activity TEXT,
      position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      seen INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_templates_project_id ON templates(project_id);

    CREATE TABLE IF NOT EXISTS seeded_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      template_key TEXT NOT NULL,
      seeded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, template_key)
    );

    CREATE INDEX IF NOT EXISTS idx_seeded_templates_project_id ON seeded_templates(project_id);
  `);

  const commentColumns = db.prepare("PRAGMA table_info(comments)").all() as { name: string }[];
  const hasSeenColumn = commentColumns.some((col) => col.name === "seen");
  if (!hasSeenColumn) {
    db.exec("ALTER TABLE comments ADD COLUMN seen INTEGER DEFAULT 0");
  }

  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  const hasStartingCommit = taskColumns.some((col) => col.name === "starting_commit");
  if (!hasStartingCommit) {
    db.exec("ALTER TABLE tasks ADD COLUMN starting_commit TEXT");
  }

  const hasClaudeLastSeen = projectColumns.some((col) => col.name === "claude_last_seen");
  if (!hasClaudeLastSeen) {
    db.exec("ALTER TABLE projects ADD COLUMN claude_last_seen DATETIME");
  }

  // Migration: Mark existing projects as having templates seeded
  // This prevents re-seeding for projects that already existed before the seeded_templates table
  const existingProjects = db.prepare("SELECT id FROM projects").all() as { id: string }[];
  const DEFAULT_TEMPLATE_KEYS = ["bug-fix", "add-tests", "refactor", "code-review", "documentation"];

  for (const project of existingProjects) {
    const seededCount = db
      .prepare("SELECT COUNT(*) as count FROM seeded_templates WHERE project_id = ?")
      .get(project.id) as { count: number };

    if (seededCount.count === 0) {
      // Check if project has any templates (meaning they were seeded before this migration)
      const templateCount = db
        .prepare("SELECT COUNT(*) as count FROM templates WHERE project_id = ?")
        .get(project.id) as { count: number };

      if (templateCount.count > 0) {
        // Mark all default templates as seeded for this project
        const insertStmt = db.prepare("INSERT OR IGNORE INTO seeded_templates (project_id, template_key) VALUES (?, ?)");
        for (const key of DEFAULT_TEMPLATE_KEYS) {
          insertStmt.run(project.id, key);
        }
      }
    }
  }
}
