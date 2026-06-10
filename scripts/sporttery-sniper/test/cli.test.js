import test from "node:test";
import assert from "node:assert/strict";

import { parseCliArgs } from "../src/cli.js";

test("schedule 命令兼容 npm 吞掉 --format 后留下的裸格式参数", () => {
  const args = parseCliArgs(["schedule", "openclaw-json"]);

  assert.equal(args.command, "schedule");
  assert.equal(args.scheduleDate, null);
  assert.equal(args.format, "openclaw-json");
});

test("schedule 命令仍支持显式日期和格式参数", () => {
  const args = parseCliArgs([
    "schedule",
    "2026-06-11",
    "--format",
    "openclaw-json",
  ]);

  assert.equal(args.command, "schedule");
  assert.equal(args.scheduleDate, "2026-06-11");
  assert.equal(args.format, "openclaw-json");
});
