import { httpGet } from "../http.ts";
import type { ToolResult } from "./index.ts";

interface Project {
  id: string;
  name: string;
  path: string;
}

export async function handleListProjects(): Promise<ToolResult> {
  const projects = await httpGet<Project[]>("/api/projects");

  if (projects.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No projects found. Create a project first by running `claude-queue` in a directory.",
        },
      ],
    };
  }

  const projectList = projects
    .map((p) => `  /queue ${p.id}  # ${p.name} (${p.path})`)
    .join("\n");

  return {
    content: [
      {
        type: "text",
        text: `Available projects:\n\n${projectList}\n\nRun one of the commands above to start working on that project's queue.`,
      },
    ],
  };
}
