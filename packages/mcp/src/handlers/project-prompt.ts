import { httpPut } from "../http.ts";
import type { ToolResult } from "./index.ts";

export async function handleSetProjectPrompt(args: Record<string, unknown>): Promise<ToolResult> {
  const projectId = args?.projectId as string;
  const prompt = args?.prompt as string;

  await httpPut(`/api/prompts/project/${projectId}`, { content: prompt });

  return {
    content: [
      {
        type: "text",
        text: `Project prompt updated for ${projectId}.`,
      },
    ],
  };
}
