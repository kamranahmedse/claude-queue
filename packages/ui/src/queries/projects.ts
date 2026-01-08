import { queryOptions } from "@tanstack/react-query";
import { httpGet } from "~/lib/http";
import type { Project } from "~/types";

export function listProjectsOptions() {
  return queryOptions({
    queryKey: ["projects"],
    queryFn: () => httpGet<Project[]>("/projects"),
  });
}
