import test from "node:test";
import assert from "node:assert/strict";
import type { ExecFileException, ExecFileOptions } from "child_process";
import { runTkMutation, tkArgsForMutation } from "../tickets/cli";
import type { TicketProject } from "../tickets/types";

interface CapturedExec {
  readonly file: string;
  readonly args: readonly string[];
  readonly options: ExecFileOptions;
}

function project(overrides: Partial<TicketProject> = {}): TicketProject {
  return {
    projectRoot: "/repo",
    ticketsDir: "/repo/.tickets",
    source: "workspace",
    isExternal: false,
    ...overrides
  };
}

test("builds fixed argv arrays without shell command assembly", () => {
  const args = tkArgsForMutation({
    kind: "addNote",
    id: "vt-demo; rm -rf /",
    text: "note && still an argv value"
  });

  assert.deepEqual(args, ["add-note", "vt-demo; rm -rf /", "note && still an argv value"]);
});

test("runs tk mutations with execFile options scoped to the active project", async () => {
  const calls: CapturedExec[] = [];
  const execFileImpl = (
    file: string,
    args: readonly string[],
    options: ExecFileOptions,
    callback: (error: ExecFileException | null, stdout: string, stderr: string) => void
  ): void => {
    calls.push({ file, args, options });
    callback(null, "vt-demo\n", "");
  };

  const result = await runTkMutation({ kind: "close", id: "vt-demo" }, {
    project: project(),
    command: "tk",
    env: { PATH: "/bin", SECRET_TOKEN: "nope" },
    execFileImpl
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  const observed = calls[0];
  assert.deepEqual(observed.args, ["close", "vt-demo"]);
  assert.equal(observed.file, "tk");
  assert.equal(observed.options.cwd, "/repo");
  assert.equal(observed.options.shell, false);
  assert.equal(observed.options.env?.TICKETS_DIR, "/repo/.tickets");
  assert.equal(observed.options.env?.PATH, "/bin");
  assert.equal(observed.options.env?.SECRET_TOKEN, undefined);
});

test("refuses to run mutations against external projects without opt-in", async () => {
  const result = await runTkMutation({ kind: "start", id: "vt-demo" }, {
    project: project({ isExternal: true })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "blockedExternal");
});
