import * as path from "path";

export function isPathInsideOrEqual(candidate: string, container: string): boolean {
  const relative = path.relative(path.resolve(container), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
