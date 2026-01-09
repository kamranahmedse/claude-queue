declare const __API_PORT__: string;

const DEV_PORT = "3334";
const PROD_PORT = "3333";

function isDevMode(): boolean {
  return __API_PORT__ === DEV_PORT;
}

export function useSkillCommand(): string {
  return isDevMode() ? "/kanban-dev" : "/kanban";
}

export function useMcpName(): string {
  return isDevMode() ? "claude-board-dev" : "claude-board";
}

export function usePort(): string {
  return isDevMode() ? DEV_PORT : PROD_PORT;
}
