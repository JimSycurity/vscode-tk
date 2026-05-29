import { execFile } from "child_process";
import type { ExecFileException, ExecFileOptions } from "child_process";
import type { TicketProject } from "./types";

export const defaultTkCommand = "tk";
const defaultTimeoutMs = 5_000;
const defaultMaxBuffer = 64 * 1024;

type ExecFileCallback = (error: ExecFileException | null, stdout: string, stderr: string) => void;
type ExecFileLike = (file: string, args: readonly string[], options: ExecFileOptions, callback: ExecFileCallback) => void;

export interface TkCliDiagnostic {
  readonly available: boolean;
  readonly command: string;
  readonly message: string;
}

export type TkMutation =
  | {
      readonly kind: "create";
      readonly title: string;
      readonly description?: string;
      readonly design?: string;
      readonly acceptance?: string;
      readonly type?: "bug" | "feature" | "task" | "epic" | "chore";
      readonly priority?: number;
      readonly assignee?: string;
      readonly externalRef?: string;
      readonly parent?: string;
      readonly tags?: readonly string[];
    }
  | { readonly kind: "start"; readonly id: string }
  | { readonly kind: "close"; readonly id: string }
  | { readonly kind: "reopen"; readonly id: string }
  | { readonly kind: "addDependency"; readonly id: string; readonly dependencyId: string }
  | { readonly kind: "removeDependency"; readonly id: string; readonly dependencyId: string }
  | { readonly kind: "link"; readonly id: string; readonly targetIds: readonly string[] }
  | { readonly kind: "unlink"; readonly id: string; readonly targetId: string }
  | { readonly kind: "addNote"; readonly id: string; readonly text: string };

export type TkRunResult =
  | { readonly ok: true; readonly stdout: string; readonly stderr: string }
  | {
      readonly ok: false;
      readonly reason: "blockedExternal" | "unavailable" | "failed";
      readonly message: string;
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode?: number | string;
    };

export interface TkRunOptions {
  readonly project: TicketProject;
  readonly command?: string;
  readonly allowExternalProjectRoot?: boolean;
  readonly timeoutMs?: number;
  readonly maxBuffer?: number;
  readonly env?: NodeJS.ProcessEnv;
  readonly execFileImpl?: ExecFileLike;
}

export function checkTkCli(command = defaultTkCommand): Promise<TkCliDiagnostic> {
  return new Promise((resolve) => {
    execFile(command, ["--help"], { timeout: 2_000, shell: false }, (error) => {
      if (error) {
        resolve({
          available: false,
          command,
          message: `Ticket CLI '${command}' is not available; read-only ticket browsing can continue.`
        });
        return;
      }

      resolve({
        available: true,
        command,
        message: `Ticket CLI '${command}' is available.`
      });
    });
  });
}

export function tkArgsForMutation(mutation: TkMutation): readonly string[] {
  switch (mutation.kind) {
    case "create":
      return createArgs(mutation);
    case "start":
      return ["start", mutation.id];
    case "close":
      return ["close", mutation.id];
    case "reopen":
      return ["reopen", mutation.id];
    case "addDependency":
      return ["dep", mutation.id, mutation.dependencyId];
    case "removeDependency":
      return ["undep", mutation.id, mutation.dependencyId];
    case "link":
      return ["link", mutation.id, ...mutation.targetIds];
    case "unlink":
      return ["unlink", mutation.id, mutation.targetId];
    case "addNote":
      return ["add-note", mutation.id, mutation.text];
  }
}

export function runTkMutation(mutation: TkMutation, options: TkRunOptions): Promise<TkRunResult> {
  return runTkArgs(tkArgsForMutation(mutation), options);
}

export function runTkArgs(args: readonly string[], options: TkRunOptions): Promise<TkRunResult> {
  if (options.project.isExternal && !options.allowExternalProjectRoot) {
    return Promise.resolve({
      ok: false,
      reason: "blockedExternal",
      message: "Refusing to run tk against an external ticket project without explicit opt-in.",
      stdout: "",
      stderr: ""
    });
  }

  const execFileImpl = options.execFileImpl ?? execFile;
  const command = options.command ?? defaultTkCommand;
  const execOptions: ExecFileOptions = {
    cwd: options.project.projectRoot,
    env: tkEnvironment(options.project, options.env ?? process.env),
    timeout: options.timeoutMs ?? defaultTimeoutMs,
    maxBuffer: options.maxBuffer ?? defaultMaxBuffer,
    encoding: "utf8",
    shell: false
  };

  return new Promise((resolve) => {
    execFileImpl(command, [...args], execOptions, (error, stdout, stderr) => {
      const stdoutText = stdout.toString();
      const stderrText = stderr.toString();
      if (!error) {
        resolve({ ok: true, stdout: stdoutText, stderr: stderrText });
        return;
      }

      resolve({
        ok: false,
        reason: error.code === "ENOENT" ? "unavailable" : "failed",
        message: error.code === "ENOENT" ? `Ticket CLI '${command}' is not available.` : `Ticket CLI '${command}' failed: ${error.message}`,
        stdout: stdoutText,
        stderr: stderrText,
        exitCode: error.code ?? undefined
      });
    });
  });
}

function createArgs(mutation: Extract<TkMutation, { readonly kind: "create" }>): readonly string[] {
  const args = ["create", mutation.title];
  pushOption(args, "--description", mutation.description);
  pushOption(args, "--design", mutation.design);
  pushOption(args, "--acceptance", mutation.acceptance);
  pushOption(args, "--type", mutation.type);
  if (mutation.priority !== undefined) {
    pushOption(args, "--priority", mutation.priority.toString());
  }
  pushOption(args, "--assignee", mutation.assignee);
  pushOption(args, "--external-ref", mutation.externalRef);
  pushOption(args, "--parent", mutation.parent);
  if (mutation.tags && mutation.tags.length > 0) {
    pushOption(args, "--tags", mutation.tags.join(","));
  }
  return args;
}

function pushOption(args: string[], option: string, value: string | undefined): void {
  if (value !== undefined && value !== "") {
    args.push(option, value);
  }
}

function tkEnvironment(project: TicketProject, source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "Path", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LC_ALL", "LC_CTYPE", "TMPDIR"]) {
    if (source[key] !== undefined) {
      env[key] = source[key];
    }
  }
  env.TICKETS_DIR = project.ticketsDir;
  return env;
}
