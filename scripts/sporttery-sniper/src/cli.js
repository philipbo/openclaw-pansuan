#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import {
  buildAnalysisContext,
  buildJcScheduleContext,
  buildOpenClawAnalysisPayload,
  buildOpenClawSchedulePayload,
  fetchMatchData,
  fetchJcSchedule,
  parseHistoryWindow,
  parseMatchId,
} from "./titan007.js";

async function main() {
  const { command, help, input, historyWindow, scheduleDate, format } = parseCliArgs(
    process.argv.slice(2),
  );
  if (help || !input) {
    printHelp();
    return;
  }

  if (command === "schedule") {
    const targetDate = scheduleDate || localDateString();
    const data = await fetchJcSchedule(globalThis.fetch, {
      saleDate: targetDate,
    });
    if (format === "openclaw-json") {
      console.log(JSON.stringify(buildOpenClawSchedulePayload(data), null, 2));
      return;
    }
    console.log(buildJcScheduleContext(data));
    console.log("");
    console.log("---");
    console.log(`已同步 ${targetDate} 竞足开售赛程：${data.matches.length} 场。`);
    return;
  }

  const data = await fetchMatchData(input);
  if (format === "openclaw-json") {
    console.log(
      JSON.stringify(
        buildOpenClawAnalysisPayload(data, { historyWindow }),
        null,
        2,
      ),
    );
    return;
  }
  const context = buildAnalysisContext({ ...data, historyWindow });
  console.log(context);
  console.log("");
  console.log("---");
  console.log(
    `已抓取比赛 ID：${parseMatchId(input)}，变化历史窗口：${formatHistoryWindow(historyWindow)}。你可以把以上内容作为本次 Codex 分析上下文。`,
  );
}

export function parseCliArgs(argv) {
  let command = "analyze";
  let input = null;
  let historyWindow = "all";
  let scheduleDate = null;
  let format = "markdown";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      return {
        command,
        help: true,
        input: null,
        historyWindow,
        scheduleDate,
        format,
      };
    }
    if (arg === "schedule" || arg === "sync-schedule") {
      command = "schedule";
      input = "schedule";
      continue;
    }
    if (arg === "--date" || arg === "-d") {
      scheduleDate = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--format" || arg === "-f") {
      format = parseFormat(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--history-window" || arg === "-w") {
      historyWindow = parseHistoryWindow(argv[i + 1]);
      i += 1;
      continue;
    }
    if (command === "schedule" && !arg.startsWith("-") && !scheduleDate) {
      const positionalFormat = tryParseFormat(arg);
      if (positionalFormat) {
        format = positionalFormat;
        continue;
      }
      scheduleDate = arg;
      continue;
    }
    if (!arg.startsWith("-") && !input) {
      input = arg;
    }
  }

  return { command, help: false, input, historyWindow, scheduleDate, format };
}

function parseFormat(input) {
  const format = String(input ?? "").trim().toLowerCase();
  if (!format || format === "markdown" || format === "md") return "markdown";
  if (format === "openclaw-json" || format === "json") {
    return "openclaw-json";
  }
  throw new Error(`输出格式无效：${input}。请使用 markdown 或 openclaw-json。`);
}

function tryParseFormat(input) {
  try {
    return parseFormat(input);
  } catch {
    return null;
  }
}

function formatHistoryWindow(historyWindow) {
  return historyWindow === "all" ? "全部" : `${historyWindow} 小时`;
}

function printHelp() {
  console.log(`用法：
  npm run analyze -- <比赛ID或titan007链接> [--history-window <窗口>]
  npm run schedule [-- <YYYY-MM-DD>]

参数：
  --history-window, -w   变化历史输出范围，可选 all 或正整数小时数（如 3、15），默认 all
  --date, -d             同步指定销售日，格式 YYYY-MM-DD；默认今天
  --format, -f           输出格式：markdown 或 openclaw-json，默认 markdown

示例：
  npm run analyze -- 2990354
  npm run analyze -- 2990354 --format openclaw-json
  npm run analyze -- 2990354 --history-window 15
  npm run analyze -- https://zq.titan007.com/analysis/2990354cn.htm -w 5
  npm run schedule
  npm run schedule -- --format openclaw-json
  npm run schedule -- 2026-06-11
  npm run schedule -- --date 2026-06-11`);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`数据抓取失败：${error.message}`);
    process.exitCode = 1;
  });
}
