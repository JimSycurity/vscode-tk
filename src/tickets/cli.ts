import { execFile } from "child_process";

export interface TkCliDiagnostic {
  readonly available: boolean;
  readonly command: string;
  readonly message: string;
}

export function checkTkCli(command = "tk"): Promise<TkCliDiagnostic> {
  return new Promise((resolve) => {
    execFile(command, ["--help"], { timeout: 2_000 }, (error) => {
      if (error) {
        resolve({
          available: false,
          command,
          message: "`tk` CLI is not available; read-only ticket browsing can continue."
        });
        return;
      }

      resolve({
        available: true,
        command,
        message: "`tk` CLI is available."
      });
    });
  });
}
