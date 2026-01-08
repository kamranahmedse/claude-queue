import { basename, resolve } from "node:path";
import { customAlphabet } from "nanoid";

const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

export function generateProjectId(): string {
  return `kbn-${generateId()}`;
}

export async function registerProject(
  port: number,
  projectPath: string,
  verbose: boolean
): Promise<string> {
  const absolutePath = resolve(projectPath);
  const projectName = basename(absolutePath);

  const response = await fetch(`http://localhost:${port}/api/projects`);
  const projects = (await response.json()) as Array<{
    id: string;
    path: string;
  }>;

  const existing = projects.find((p) => p.path === absolutePath);
  if (existing) {
    if (verbose) {
      console.log(`Project already registered: ${existing.id}`);
    }
    return existing.id;
  }

  const createResponse = await fetch(`http://localhost:${port}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: generateProjectId(),
      name: projectName,
      path: absolutePath,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to register project: ${await createResponse.text()}`);
  }

  const project = (await createResponse.json()) as { id: string };
  if (verbose) {
    console.log(`Registered new project: ${project.id}`);
  }
  return project.id;
}
