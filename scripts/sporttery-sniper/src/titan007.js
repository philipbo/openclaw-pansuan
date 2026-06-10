const TITAN_DETAIL_BASE = "https://live.titan007.com/detail";
const TITAN_STATIC_BASE = "https://livestatic.titan007.com";
const TITAN_ZQ_BASE = "https://zq.titan007.com";
const TITAN_ANALYSIS_BASE = "https://zq.titan007.com/analysis";
const TITAN_VIP_BASE = "https://vip.titan007.com";
const TITAN_1X2_BASE = "https://1x2.titan007.com";
const TITAN_1X2_DATA_BASE = "https://1x2d.titan007.com";
const TITAN_JC_BASE = "https://jc.titan007.com";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
const DEFAULT_REQUEST_DELAY_RANGE_MS = [400, 1000];
const DEFAULT_REQUEST_CONCURRENCY = 2;

const SELECTED_ASIAN_TOTAL_COMPANIES = new Map([
  ["1", "澳门"],
  ["3", "皇冠"],
  ["12", "易胜博"],
  ["8", "365bet"],
  ["47", "平博"],
  ["42", "188"],
  ["48", "香港马会"],
]);

const SELECTED_EUROPE_COMPANIES = new Map([
  ["115", "威廉"],
  ["104", "Interwetten"],
  ["82", "立博"],
  ["281", "365bet"],
  ["80", "澳门"],
  ["545", "皇冠"],
  ["90", "易胜博"],
  ["177", "平博"],
  ["976", "188"],
  ["432", "香港马会"],
]);

const HANDICAP_NAMES = [
  "平手",
  "平/半",
  "半球",
  "半/一",
  "一球",
  "一/球半",
  "球半",
  "球半/两",
  "两球",
  "两/两球半",
  "两球半",
  "两球半/三",
  "三球",
  "三/三球半",
  "三球半",
  "三球半/四球",
  "四球",
  "四/四球半",
  "四球半",
  "四球半/五",
  "五球",
  "五/五球半",
  "五球半",
  "五球半/六",
  "六球",
  "六/六球半",
  "六球半",
  "六球半/七",
  "七球",
  "七/七球半",
  "七球半",
  "七球半/八",
  "八球",
  "八/八球半",
  "八球半",
  "八球半/九",
  "九球",
  "九/九球半",
  "九球半",
  "九球半/十",
  "十球",
];

const JC_STATE_NAMES = new Map([
  ["-14", ""],
  ["-13", "完"],
  ["-11", "取消"],
  ["-10", "腰斩"],
  ["-9", "中断"],
  ["-8", "推迟"],
  ["-1", "完"],
  ["0", "未开场"],
  ["1", "上半场"],
  ["2", "待定"],
  ["3", "下半场"],
  ["4", "加时"],
  ["5", "点球"],
]);

export function parseMatchId(input) {
  const match = String(input ?? "").match(/(\d{6,})/);
  if (!match) {
    throw new Error("未找到比赛 ID，请输入数字 ID 或 titan007 比赛链接。");
  }
  return match[1];
}

export function buildDetailUrl(input) {
  return `${TITAN_DETAIL_BASE}/${parseMatchId(input)}cn.htm`;
}

export function buildAnalysisUrl(input) {
  return `${TITAN_ANALYSIS_BASE}/${parseMatchId(input)}cn.htm`;
}

export function buildOddsUrl(matchId) {
  const id = parseMatchId(matchId);
  return `${TITAN_STATIC_BASE}/jsData/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.js`;
}

export function buildMarketUrls(input) {
  const id = parseMatchId(input);
  return {
    analysis: `${TITAN_ANALYSIS_BASE}/${id}cn.htm`,
    liveDetail: buildDetailUrl(id),
    liveOdds: buildOddsUrl(id),
    asianList: `${TITAN_VIP_BASE}/AsianOdds_n.aspx?id=${id}&l=0`,
    asianMacauHistory: `${TITAN_VIP_BASE}/changeDetail/handicap.aspx?id=${id}&companyID=1&l=0`,
    overUnderList: `${TITAN_VIP_BASE}/OverDown_n.aspx?id=${id}&l=0`,
    overUnderMacauHistory: `${TITAN_VIP_BASE}/changeDetail/overunder.aspx?id=${id}&companyID=1&l=0`,
    europeList: `${TITAN_1X2_BASE}/oddslist/${id}.htm`,
    europeData: `${TITAN_1X2_DATA_BASE}/${id}.js`,
    jcAnalysisData: `${TITAN_ZQ_BASE}/default/getAnalyData?sid=${id}&t=1`,
    crowFullIndex: `${TITAN_ZQ_BASE}/analysis/odds/${id}.htm`,
  };
}

export function buildRequestHeaders(url) {
  return {
    "user-agent": BROWSER_USER_AGENT,
    referer: refererFor(url),
  };
}

export function createHumanLikeFetch(fetchImpl, options = {}) {
  const {
    delayRangeMs = DEFAULT_REQUEST_DELAY_RANGE_MS,
    concurrency = DEFAULT_REQUEST_CONCURRENCY,
    random = Math.random,
    wait = sleep,
  } = options;
  const maxConcurrency = normalizeConcurrency(concurrency);
  const pending = [];
  let activeCount = 0;
  let hasRequested = false;
  let isLaunching = false;

  return async (url, requestOptions) => {
    const task = new Promise((resolve, reject) => {
      pending.push({ url, requestOptions, resolve, reject });
      launchPendingRequests();
    });
    return task;
  };

  function launchPendingRequests() {
    if (isLaunching) return;
    isLaunching = true;
    void launchLoop();
  }

  async function launchLoop() {
    try {
      while (activeCount < maxConcurrency && pending.length) {
        const item = pending.shift();
        if (hasRequested) {
          await wait(randomDelayMs(delayRangeMs, random));
        }
        hasRequested = true;
        activeCount += 1;
        void runRequest(item);
      }
    } finally {
      isLaunching = false;
      if (activeCount < maxConcurrency && pending.length) {
        launchPendingRequests();
      }
    }
  }

  async function runRequest({ url, requestOptions, resolve, reject }) {
    try {
      resolve(await fetchImpl(url, requestOptions));
    } catch (error) {
      reject(error);
    } finally {
      activeCount -= 1;
      launchPendingRequests();
    }
  }
}

export async function fetchMatchData(
  input,
  fetchImpl = globalThis.fetch,
  fetchOptions = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("当前 Node 环境不支持 fetch，请使用 Node 20 或更新版本。");
  }

  const humanFetch = createHumanLikeFetch(fetchImpl, fetchOptions);
  const id = parseMatchId(input);
  const urls = buildMarketUrls(id);
  const asianHistoryUrls = buildOddsHistoryUrls(id, "asian");
  const overUnderHistoryUrls = buildOddsHistoryUrls(id, "overUnder");
  const [
    liveDetailHtml,
    analysisHtml,
    asianList,
    overUnderList,
    europeData,
    jcAnalysisData,
    crowFullIndex,
  ] = await Promise.all([
    fetchText(urls.liveDetail, humanFetch),
    fetchText(urls.analysis, humanFetch),
    fetchOptionalText(urls.asianList, humanFetch),
    fetchOptionalText(urls.overUnderList, humanFetch),
    fetchOptionalText(urls.europeData, humanFetch),
    fetchOptionalText(urls.jcAnalysisData, humanFetch),
    fetchOptionalText(urls.crowFullIndex, humanFetch),
  ]);
  const liveDetail = parseDetailHtml(liveDetailHtml);
  const analysisData = parseAnalysisHtml(analysisHtml);
  const detail = {
    ...liveDetail,
    leagueStandings: analysisData.leagueStandings,
    headToHead: analysisData.headToHead,
  };
  const kickoffTime = detail.basic.kickoffTime;
  const [asianHistoryResults, overUnderHistoryResults] = await Promise.all([
    fetchOddsHistories(asianHistoryUrls, "asian", humanFetch, kickoffTime),
    fetchOddsHistories(
      overUnderHistoryUrls,
      "overUnder",
      humanFetch,
      kickoffTime,
    ),
  ]);
  const europe = parseEuropeOddsScript(europeData.text, undefined, kickoffTime);
  const asianCompanies = applyLatestHistoryToCompanies(
    parseOddsCompanyList(asianList.text, "asian"),
    asianHistoryResults,
    "asian",
    kickoffTime,
  );
  const overUnderCompanies = applyLatestHistoryToCompanies(
    parseOddsCompanyList(overUnderList.text, "overUnder"),
    overUnderHistoryResults,
    "overUnder",
    kickoffTime,
  );

  return {
    sourceUrl: urls.analysis,
    liveDetailUrl: urls.liveDetail,
    urls,
    detail,
    markets: {
      asianCompanies,
      overUnderCompanies,
      asianHistories: asianHistoryResults,
      overUnderHistories: overUnderHistoryResults,
      asianMacauHistory:
        asianHistoryResults.find((item) => item.companyId === "1")?.records ??
        [],
      overUnderMacauHistory:
        overUnderHistoryResults.find((item) => item.companyId === "1")
          ?.records ?? [],
      europeCompanies: europe.companies,
      europeHistories: europe.histories,
      europeDataStatus: europeData.ok ? "" : `未抓取：${europeData.error}`,
      jcOdds: jcAnalysisData.ok ? parseJcOddsData(jcAnalysisData.text) : null,
      jcOddsStatus: jcAnalysisData.ok ? "" : `未抓取：${jcAnalysisData.error}`,
      crowFullIndex: crowFullIndex.ok
        ? parseCrowFullIndexData(crowFullIndex.text)
        : null,
      crowFullIndexStatus: crowFullIndex.ok
        ? ""
        : `未抓取：${crowFullIndex.error}`,
    },
  };
}

export async function fetchJcSchedule(fetchImpl = globalThis.fetch, options = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("当前 Node 环境不支持 fetch，请使用 Node 20 或更新版本。");
  }

  const saleDate = normalizeJcSaleDate(options.saleDate);
  const scheduleText = await fetchText(
    `${TITAN_JC_BASE}/xml/bf_jc.txt`,
    fetchImpl,
  );
  const oddsText = await fetchOptionalText(
    `${TITAN_JC_BASE}/xml/odds_jc.txt`,
    fetchImpl,
  );
  const schedule = parseJcScheduleText(scheduleText);
  const odds = parseJcScheduleOddsText(oddsText.text);
  const matches = saleDate
    ? schedule.matches.filter((match) => match.saleDate === saleDate)
    : schedule.matches;

  return {
    ...schedule,
    saleDate,
    sourceUrl: `${TITAN_JC_BASE}/index.aspx`,
    oddsUrl: `${TITAN_JC_BASE}/xml/odds_jc.txt`,
    matches: matches.map((match) => ({
      ...match,
      jcOdds: odds.get(match.matchId) ?? null,
    })),
  };
}

export function parseJcScheduleText(text) {
  const [leagueDomain = "", scheduleDomain = ""] = String(text ?? "").split(
    "$",
  );
  const leagues = new Map();
  for (const record of leagueDomain.split("!")) {
    if (!record) continue;
    const league = parseJcLeagueRecord(record);
    leagues.set(leagueKey(league.leagueId, league.subLeagueId), league);
    if (!league.subLeagueId) leagues.set(league.leagueId, league);
  }

  return {
    leagues,
    matches: scheduleDomain
      .split("!")
      .filter(Boolean)
      .map((record) => parseJcScheduleRecord(record, leagues)),
  };
}

export function parseJcScheduleOddsText(text) {
  const odds = new Map();
  for (const record of String(text ?? "").split("!")) {
    if (!record) continue;
    const arr = record.split("^");
    const matchId = arr[0];
    if (!matchId) continue;
    odds.set(matchId, {
      matchId,
      standard: {
        first: {
          homeWin: value(arr[1]),
          draw: value(arr[2]),
          awayWin: value(arr[3]),
        },
        current: {
          homeWin: value(arr[5]),
          draw: value(arr[6]),
          awayWin: value(arr[7]),
        },
      },
      handicap: value(arr[4]),
    });
  }
  return odds;
}

export function parseDetailHtml(html) {
  const scheduleID = pickScriptVar(html, "scheduleID");
  const homeTeam =
    pickScriptVar(html, "homeTeamName") || pickScriptVar(html, "hometeam");
  const awayTeam =
    pickScriptVar(html, "guestTeamName") || pickScriptVar(html, "guestteam");
  const kickoffTime =
    pickScriptVar(html, "strTime") ||
    textOfFirst(html, /<span[^>]*class=["']time["'][^>]*>([\s\S]*?)<\/span>/i);
  const state = pickScriptVar(html, "state");
  const score = parseMatchScoreFromDetail(html);
  const league = textOfFirst(
    html,
    /<a[^>]*class=["']LName["'][^>]*>([\s\S]*?)<\/a>/i,
  );
  const venue =
    textOfFirst(
      html,
      /场地：\s*<a[^>]*class=['"]place['"][^>]*>([\s\S]*?)<\/a>/i,
    ) || textOfFirst(html, /场地[：:]\s*([^<]+?)(?:<\/a>|天气)/i);
  const weather =
    textOfFirst(html, /<label>\s*天气：([\s\S]*?)<\/label>/i) ||
    textOfFirst(html, /天气[：:]\s*([^&\s<]+)/i);
  const temperature =
    textOfFirst(html, /<label>\s*温度：([\s\S]*?)<\/label>/i) ||
    textOfFirst(html, /温度[：:]\s*([^<]+)/i);
  const homeBlock = firstMatch(
    html,
    /<div[^>]*class=["']homeN["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const awayBlock = firstMatch(
    html,
    /<div[^>]*class=["']guestN["'][^>]*>([\s\S]*?)<\/div>/i,
  );

  const basic = {
    matchId: scheduleID,
    league,
    kickoffTime,
    homeTeam,
    awayTeam,
    venue,
    weather,
    temperature,
    homeFormation: extractFormation(homeBlock),
    awayFormation: extractFormation(awayBlock),
    homeCoach: attrOfFirst(
      homeBlock,
      /class=['"]coach['"][^>]*title=['"]([^'"]+)['"]/i,
    ),
    awayCoach: attrOfFirst(
      awayBlock,
      /class=['"]coach['"][^>]*title=['"]([^'"]+)['"]/i,
    ),
  };
  const status = matchStatusName(state);
  if (status) basic.status = status;
  if (score) basic.score = score;

  return {
    basic,
    lineupInjuries: parseLineupInjuries(html),
    teamStats: parseTeamStats(html, "techCountAll"),
    sameHomeAwayStats: parseTeamStats(html, "techCountSame"),
  };
}

export function parseAnalysisHtml(html) {
  return {
    leagueStandings: parseLeagueStandings(html),
    headToHead: parseHeadToHeadRecords(html, 3),
  };
}

export function parseLineupInjuries(html) {
  const source = String(html || "");
  const hurtIndex = source.search(
    /<div\b[^>]*class=["'][^"']*\bhurtPlay\b[^"']*["'][^>]*>/i,
  );
  if (hurtIndex < 0) return { home: [], away: [] };

  const tail = source.slice(hurtIndex);
  const endIndex = findFirstPositiveIndex([
    tail.search(/<div\b[^>]*id=["']icons["']/i),
    tail.search(/<table\b[^>]*id=["']techCountAll["']/i),
  ]);
  const block = endIndex >= 0 ? tail.slice(0, endIndex) : tail;
  const homeStart = block.search(/<div\b[^>]*class=["']home["'][^>]*>/i);
  const middleStart = block.search(/<div\b[^>]*class=["']bu_txt["'][^>]*>/i);
  const guestStart =
    middleStart >= 0
      ? block
          .slice(middleStart)
          .search(/<div\b[^>]*class=["']guest["'][^>]*>/i)
      : -1;

  const homeBlock =
    homeStart >= 0 && middleStart > homeStart
      ? block.slice(homeStart, middleStart)
      : "";
  const guestBlock =
    middleStart >= 0 && guestStart >= 0
      ? block.slice(middleStart + guestStart)
      : "";

  return {
    home: parseInjuryPlayers(homeBlock),
    away: parseInjuryPlayers(guestBlock),
  };
}

export function parseLeagueStandings(html) {
  const blockMatch = String(html || "").match(
    /联赛积分排名[\s\S]*?<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>/i,
  );
  const block = blockMatch?.[0] ?? "";
  if (!block) return [];

  return [...block.matchAll(/<TABLE[\s\S]*?<\/TABLE>/gi)]
    .map((match) => parseLeagueStandingsTable(match[0]))
    .filter((team) => team.fullTime.length);
}

export function parseHeadToHeadRecords(html, limit = 3) {
  const rows = parseScriptArrayLiteral(html, "v_data");
  return rows.slice(0, limit).map((row) => ({
    date: value(row[0]),
    league: value(row[2]),
    homeTeam: cleanTeamLabel(row[5]),
    awayTeam: cleanTeamLabel(row[7]),
    score: value(row[10]),
  }));
}

export function parseOddsScript(script) {
  return [
    ...parseCompanyOdds(script, "sOdds", "Crow*"),
    ...parseCompanyOdds(script, "sOdds8", "36*"),
  ];
}

export function parseOddsCompanyList(
  html,
  market,
  allowedCompanies = SELECTED_ASIAN_TOTAL_COMPANIES,
) {
  if (!html) return [];
  const rows = [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1])
    .filter((row) => /name=["']oddsShow["']/i.test(row));

  return rows
    .map((row) => {
      const cells = extractCells(row);
      const companyId = firstMatch(row, /data-id=["']?(\d+)["']?/i);
      const detailHref = firstMatch(
        row,
        /href=["']([^"']*changeDetail\/(?:handicap|overunder)\.aspx[^"']*)["']/i,
      );
      const openingTime = attrOfFirst(
        cells[3]?.raw ?? "",
        /title=["']([^"']+)["']/i,
      );
      const rawCompany = normalizeCompany(cells[1]?.text);
      const base = {
        market,
        companyId,
        company: allowedCompanies?.get(companyId) ?? rawCompany,
        rawCompany,
      };
      if (market === "asian") {
        return {
          ...base,
          opening: {
            home: cells[3]?.text ?? "",
            line: cells[4]?.text ?? "",
            away: cells[5]?.text ?? "",
            time: openingTime,
          },
          current: {
            home: cells[6]?.text ?? "",
            line: cells[7]?.text ?? "",
            away: cells[8]?.text ?? "",
          },
          detailUrl: absolutizeVipUrl(detailHref),
        };
      }
      return {
        ...base,
        opening: {
          over: cells[3]?.text ?? "",
          line: cells[4]?.text ?? "",
          under: cells[5]?.text ?? "",
          time: openingTime,
        },
        current: {
          over: cells[6]?.text ?? "",
          line: cells[7]?.text ?? "",
          under: cells[8]?.text ?? "",
        },
        detailUrl: absolutizeVipUrl(detailHref),
      };
    })
    .filter(
      (company) => !allowedCompanies || allowedCompanies.has(company.companyId),
    );
}

export function parseOddsChangeHistory(
  html,
  market,
  companyId,
  kickoffTime = "",
) {
  if (!html) return [];
  return [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => extractCells(match[1]).map((cell) => cell.text))
    .filter((cells) => cells.length >= 5)
    .filter((cells) => !isHistoryHeaderRow(cells))
    .map((cells) => normalizeHistoryRow(cells, market, companyId))
    .filter(Boolean)
    .filter((record) => record.home && record.line && record.away)
    .filter((record) => !isRollingStatus(record.status))
    .filter((record) => !isAfterKickoff(record.time, kickoffTime));
}

function isRollingStatus(status) {
  return cleanText(status) === "滚";
}

function isHistoryHeaderRow(cells) {
  if (detectHistoryRowFormat(cells) !== null) return false;
  if (cells.length >= 7) {
    return cells[0] === "时间" || cells[3] === "盘" || cells[5] === "变化时间";
  }
  if (cells.length === 5) {
    return (
      cells[1] === "盘" || cells[1] === "进球数" || cells[3] === "变化时间"
    );
  }
  return false;
}

function isHistoryChangeTime(text) {
  return /^\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}$/.test(cleanText(text));
}

function isHistoryStatus(text) {
  const status = cleanText(text);
  return status === "即" || status === "早" || status === "滚";
}

function detectHistoryRowFormat(cells) {
  if (
    cells.length >= 7 &&
    isHistoryChangeTime(cells[5]) &&
    isHistoryStatus(cells[6])
  ) {
    return "expanded";
  }
  if (
    cells.length === 5 &&
    isHistoryChangeTime(cells[3]) &&
    isHistoryStatus(cells[4])
  ) {
    return "compact";
  }
  return null;
}

function normalizeHistoryRow(cells, market, companyId) {
  const format = detectHistoryRowFormat(cells);
  if (format === "expanded") {
    return {
      market,
      companyId: String(companyId),
      time: cells[5] ?? "",
      score: cells[1] ?? "",
      home: cells[2] ?? "",
      line: cells[3] ?? "",
      away: cells[4] ?? "",
      status: cells[6] ?? "",
    };
  }
  if (format === "compact") {
    return {
      market,
      companyId: String(companyId),
      time: cells[3] ?? "",
      score: "",
      home: cells[0] ?? "",
      line: cells[1] ?? "",
      away: cells[2] ?? "",
      status: cells[4] ?? "",
    };
  }
  return null;
}

function isAfterKickoff(recordTime, kickoffTime) {
  const recordDate = parseRecordDateTime(recordTime, kickoffTime);
  const kickoffDate = parseKickoffDateTime(kickoffTime);
  if (!recordDate || !kickoffDate) return false;
  return recordDate > kickoffDate;
}

function isKickoffInPast(kickoffTime) {
  const kickoffDate = parseKickoffDateTime(kickoffTime);
  return kickoffDate ? Date.now() > kickoffDate.getTime() : false;
}

function parseKickoffDateTime(kickoffTime) {
  const match = String(kickoffTime || "").match(
    /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
  );
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

function parseRecordDateTime(recordTime, kickoffTime) {
  const kickoff = parseKickoffDateTime(kickoffTime);
  if (!kickoff) return null;
  const match = String(recordTime || "").match(
    /(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/,
  );
  if (!match) return null;
  return new Date(
    kickoff.getFullYear(),
    Number(match[1]) - 1,
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  );
}

export function parseEuropeOddsScript(
  script,
  allowedCompanies = SELECTED_EUROPE_COMPANIES,
  kickoffTime = "",
) {
  const rows = extractArrayFunctionStrings(script, "game")
    .map((row) => row.split("|"))
    .filter((row) => allowedCompanies.has(row[0]));

  const companies = rows.map((row) => ({
    market: "europe",
    companyId: row[0],
    recordId: row[1],
    company: allowedCompanies.get(row[0]),
    rawCompany: row[21] ?? "",
    opening: {
      home: row[3] ?? "",
      draw: row[4] ?? "",
      away: row[5] ?? "",
      returnRate: row[9] ?? "",
    },
    current: {
      home: row[10] ?? "",
      draw: row[11] ?? "",
      away: row[12] ?? "",
      returnRate: row[16] ?? "",
    },
    kelly: { home: row[17] ?? "", draw: row[18] ?? "", away: row[19] ?? "" },
    updateTime: row[20] ?? "",
  }));

  const companyByRecordId = new Map(
    companies.map((company) => [company.recordId, company]),
  );
  const histories = {};
  for (const item of extractArrayFunctionStrings(script, "gameDetail")) {
    const [recordId, recordsText = ""] = item.split("^");
    const company = companyByRecordId.get(recordId);
    if (!company) continue;
    histories[company.companyId] = recordsText
      .split(";")
      .filter(Boolean)
      .filter((record) => !isAfterKickoff(record.split("|")[3], kickoffTime))
      .map((record) => {
        const cells = record.split("|");
        return {
          market: "europe",
          companyId: company.companyId,
          company: company.company,
          time: cells[3] ?? "",
          home: cells[0] ?? "",
          draw: cells[1] ?? "",
          away: cells[2] ?? "",
          year: cells[7] ?? "",
        };
      });
  }

  return {
    companies: applyLatestEuropeHistoryToCompanies(
      companies,
      histories,
      kickoffTime,
    ),
    histories,
  };
}

export function parseJcOddsData(jsonText) {
  if (!jsonText) return null;
  const data = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
  const jcOdds = data?.jcOdds;
  if (!jcOdds) return null;

  return {
    winDrawLose: parseWinDrawLose(jcOdds.wlOdds),
    handicapWinDrawLose: {
      handicap: value(jcOdds.sfOdds?.rf),
      ...parseWinDrawLose(jcOdds.sfOdds),
    },
    totalGoals: parseTotalGoalOdds(jcOdds.goalOdds?.live),
    correctScores: parseCorrectScoreOdds(jcOdds.scoreOdds?.live),
  };
}

export function parseCrowFullIndexData(html) {
  const block = firstMatch(
    html,
    /<div\b[^>]*id=['"]analy_sbAllOdds['"][^>]*>([\s\S]*?)(?=<div\b[^>]*class=['"]porletP['"]|$)/i,
  );
  if (!block) return null;

  return {
    correctScores: parseCrowCorrectScores(findTableByLabel(block, "波胆")),
    goalBands: parseCrowGoalBands(findTableByLabel(block, "入球数")),
    teamTotals: parseCrowTeamTotals(findTableByLabel(block, "总入球")),
  };
}

export function parseHistoryWindow(input) {
  const text = String(input ?? "all")
    .trim()
    .toLowerCase();
  if (!text || text === "all" || text === "全部") return "all";
  const hours = Number(text.replace(/h$/, ""));
  if (Number.isInteger(hours) && hours > 0) return hours;
  throw new Error(
    `变化历史窗口无效：${input}。请使用 all 或正整数小时数（如 3、15）。`,
  );
}

export function describeHistoryWindow(historyWindow = "all") {
  if (historyWindow === "all") {
    return "开赛前全部变化记录（已过滤滚球和开赛后数据）";
  }
  return `开赛前 ${historyWindow} 小时内全部变化记录，并额外保留最早一条初盘参考（已过滤滚球和开赛后数据）`;
}

export function selectHistoryRecords(
  records = [],
  kickoffTime = "",
  historyWindow = "all",
) {
  if (!records.length) return [];
  const kickoffDate = parseKickoffDateTime(kickoffTime);
  if (!kickoffDate) return records;

  const preKickoff = records.filter((record) => {
    const recordDate = parseRecordDateTime(record.time, kickoffTime);
    return recordDate && recordDate <= kickoffDate;
  });
  if (historyWindow === "all") return preKickoff;

  const windowStart = new Date(
    kickoffDate.getTime() - historyWindow * 60 * 60 * 1000,
  );
  const selected = preKickoff.filter((record) => {
    const recordDate = parseRecordDateTime(record.time, kickoffTime);
    return recordDate && recordDate >= windowStart;
  });
  const initial = preKickoff.at(-1);
  if (initial && !selected.includes(initial)) selected.push(initial);
  return selected.length ? selected : [initial].filter(Boolean);
}

export function buildJcScheduleContext(schedule) {
  const matches = schedule?.matches ?? [];
  const lines = [];
  lines.push("# 竞足开售赛程");
  lines.push("");
  lines.push(`- 数据源：${schedule?.sourceUrl || `${TITAN_JC_BASE}/index.aspx`}`);
  if (schedule?.saleDate) lines.push(`- 销售日：${schedule.saleDate}`);
  lines.push(`- 共 ${matches.length} 场`);
  lines.push("");
  lines.push(
    "| 竞彩编号 | 比赛ID | 销售日 | 开球时间 | 赛事 | 状态 | 对阵 | 让球 | 即时胜平负 |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | ---: | --- |");
  for (const match of matches) {
    lines.push(
      `| ${match.jcNo} | ${match.matchId} | ${match.saleDate} | ${match.kickoffTime} | ${match.league} | ${match.stateName || match.state} | ${match.homeTeam} VS ${match.awayTeam} | ${match.jcOdds?.handicap ?? match.firstGoal} | ${formatJcStandardOdds(match.jcOdds)} |`,
    );
  }
  return lines.join("\n");
}

export function buildOpenClawSchedulePayload(schedule, options = {}) {
  const matches = schedule?.matches ?? [];
  return {
    kind: "openclaw.schedule",
    generatedAt: options.generatedAt ?? localDateTimeString(),
    sourceUrl: schedule?.sourceUrl || `${TITAN_JC_BASE}/index.aspx`,
    oddsUrl: schedule?.oddsUrl || `${TITAN_JC_BASE}/xml/odds_jc.txt`,
    saleDate: schedule?.saleDate ?? "",
    summary: summarizeJcMatches(matches),
    matches: matches.map((match) => ({
      no: match.jcNo ?? "",
      matchId: match.matchId ?? "",
      league: match.league ?? "",
      leagueLevel: classifyLeagueLevel(match.league),
      kickoffTime: match.kickoffTime ?? "",
      status: match.stateName || match.state || "",
      homeTeam: match.homeTeam ?? "",
      score: formatMatchScore(match.score),
      awayTeam: match.awayTeam ?? "",
      analysisUrl: buildAnalysisUrl(match.matchId),
      handicap: match.firstGoal ?? "",
      jcOdds: match.jcOdds ?? null,
    })),
  };
}

export function buildOpenClawAnalysisPayload(data, options = {}) {
  const basic = data?.detail?.basic ?? {};
  return {
    kind: "openclaw.analysis",
    generatedAt: options.generatedAt ?? localDateTimeString(),
    historyWindow: options.historyWindow ?? "all",
    match: {
      matchId: basic.matchId ?? parseMatchId(data?.sourceUrl ?? ""),
      league: basic.league ?? "",
      kickoffTime: basic.kickoffTime ?? "",
      homeTeam: basic.homeTeam ?? "",
      awayTeam: basic.awayTeam ?? "",
      analysisUrl: data?.sourceUrl ?? buildAnalysisUrl(basic.matchId),
      liveDetailUrl: data?.liveDetailUrl ?? buildDetailUrl(basic.matchId),
    },
    detail: data?.detail ?? {},
    lineupInjuries: data?.detail?.lineupInjuries ?? { home: [], away: [] },
    markets: data?.markets ?? {},
    correctScoreOdds: buildCorrectScoreOdds(data?.markets ?? {}),
    context: buildAnalysisContext({
      detail: data?.detail ?? {},
      markets: data?.markets ?? {},
      sourceUrl: data?.sourceUrl,
      liveDetailUrl: data?.liveDetailUrl,
      historyWindow: options.historyWindow ?? "all",
    }),
  };
}

function buildCorrectScoreOdds(markets = {}) {
  return {
    crownFullIndex: markets.crowFullIndex?.correctScores ?? {
      homeWin: [],
      draw: [],
      awayWin: [],
    },
    jc: markets.jcOdds?.correctScores ?? {
      homeWin: [],
      draw: [],
      awayWin: [],
    },
  };
}

function summarizeJcMatches(matches) {
  return matches.reduce(
    (summary, match) => {
      summary.total += 1;
      const state = match.stateName || match.state || "";
      if (state === "未开场" || state === "待定") summary.notStarted += 1;
      else if (state === "完") summary.finished += 1;
      else if (state) summary.inProgress += 1;
      return summary;
    },
    { total: 0, notStarted: 0, inProgress: 0, finished: 0 },
  );
}

function classifyLeagueLevel(leagueName = "") {
  const league = String(leagueName);
  if (/友谊|熱身|热身|邀请|邀請|U21|U23/i.test(league)) return "排除";
  if (
    /英超|西甲|德甲|意甲|法甲|欧冠|歐冠|欧联|歐聯|欧罗巴|歐羅巴|欧协|歐協|葡超|荷甲|亚冠|亞冠|世界杯|世界盃|欧洲杯|歐洲盃|亚洲杯|亞洲盃/.test(
      league,
    )
  ) {
    return "高";
  }
  if (
    /英冠|德乙|法乙|荷乙|日职|日職|韩K|韓K|澳超|沙特|瑞典超|挪超|丹超|芬超|北欧|北歐/.test(
      league,
    )
  ) {
    return "中";
  }
  return "低";
}

function formatMatchScore(score) {
  if (!score) return "-";
  const home = score.home ?? "";
  const away = score.away ?? "";
  if (home === "" || away === "") return "-";
  return `${home}-${away}`;
}

function localDateTimeString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function applyLatestEuropeHistoryToCompanies(
  companies,
  histories,
  kickoffTime,
) {
  if (!kickoffTime) return companies;
  return companies.map((company) => {
    const latest = histories[company.companyId]?.[0];
    if (!latest) return company;
    return {
      ...company,
      current: {
        home: latest.home,
        draw: latest.draw,
        away: latest.away,
        returnRate: company.current.returnRate,
      },
    };
  });
}

function parseWinDrawLose(odds) {
  return {
    first: {
      win: value(odds?.first?.win),
      draw: value(odds?.first?.draw),
      lose: value(odds?.first?.lose),
    },
    current: {
      win: value(odds?.live?.win),
      draw: value(odds?.live?.draw),
      lose: value(odds?.live?.lose),
    },
  };
}

function formatJcStandardOdds(jcOdds) {
  const current = jcOdds?.standard?.current;
  if (!current) return "";
  return [current.homeWin, current.draw, current.awayWin]
    .filter((item) => item !== "")
    .join("/");
}

function parseTotalGoalOdds(live = {}) {
  return [
    { goals: "0", odds: value(live.g0) },
    { goals: "1", odds: value(live.g1) },
    { goals: "2", odds: value(live.g2) },
    { goals: "3", odds: value(live.g3) },
    { goals: "4", odds: value(live.g4) },
    { goals: "5", odds: value(live.g5) },
    { goals: "6", odds: value(live.g6) },
    { goals: "7+", odds: value(live.g7) },
  ].filter((item) => item.odds);
}

function parseCorrectScoreOdds(live = {}) {
  return {
    homeWin: [
      { score: "1-0", odds: value(live.score10) },
      { score: "2-0", odds: value(live.score20) },
      { score: "2-1", odds: value(live.score21) },
      { score: "3-0", odds: value(live.score30) },
      { score: "3-1", odds: value(live.score31) },
      { score: "3-2", odds: value(live.score32) },
      { score: "4-0", odds: value(live.score40) },
      { score: "4-1", odds: value(live.score41) },
      { score: "4-2", odds: value(live.score42) },
      { score: "5-0", odds: value(live.score50) },
      { score: "5-1", odds: value(live.score51) },
      { score: "5-2", odds: value(live.score52) },
      { score: "胜其他", odds: value(live.scoreWin) },
    ].filter((item) => item.odds),
    draw: [
      { score: "0-0", odds: value(live.score00) },
      { score: "1-1", odds: value(live.score11) },
      { score: "2-2", odds: value(live.score22) },
      { score: "3-3", odds: value(live.score33) },
      { score: "平其他", odds: value(live.scoreDraw) },
    ].filter((item) => item.odds),
    awayWin: [
      { score: "0-1", odds: value(live.score01) },
      { score: "0-2", odds: value(live.score02) },
      { score: "1-2", odds: value(live.score12) },
      { score: "0-3", odds: value(live.score03) },
      { score: "1-3", odds: value(live.score13) },
      { score: "2-3", odds: value(live.score23) },
      { score: "0-4", odds: value(live.score04) },
      { score: "1-4", odds: value(live.score14) },
      { score: "2-4", odds: value(live.score24) },
      { score: "0-5", odds: value(live.score05) },
      { score: "1-5", odds: value(live.score15) },
      { score: "2-5", odds: value(live.score25) },
      { score: "负其他", odds: value(live.scoreLose) },
    ].filter((item) => item.odds),
  };
}

function parseCrowCorrectScores(table = "") {
  const rows = tableRows(table);
  const headers = rows[0]?.slice(1) ?? [];
  const homeOdds = rows[1]?.slice(1) ?? [];
  const awayOdds = rows[2]?.slice(1) ?? [];
  const homeScoreCount = 10;
  const drawHeaders = headers.slice(homeScoreCount);
  const drawOdds = homeOdds.slice(homeScoreCount);

  return {
    homeWin: zipOdds(
      headers.slice(0, homeScoreCount),
      homeOdds.slice(0, homeScoreCount),
      "score",
    ),
    draw: zipOdds(drawHeaders, drawOdds, "score"),
    awayWin: zipOdds(
      headers.slice(0, homeScoreCount).map(reverseScore),
      awayOdds,
      "score",
    ),
  };
}

function parseCrowGoalBands(table = "") {
  const rows = tableRows(table);
  const ranges = rows[0]?.slice(1) ?? [];
  const odds = alignedOddsRow(rows[1], ranges.length);
  return zipOdds(ranges, odds, "range");
}

function parseCrowTeamTotals(table = "") {
  const odds = alignedOddsRow(tableRows(table)[1], 6);
  return {
    home: { over: odds[0] ?? "", line: odds[1] ?? "", under: odds[2] ?? "" },
    away: { over: odds[3] ?? "", line: odds[4] ?? "", under: odds[5] ?? "" },
  };
}

function alignedOddsRow(row = [], expectedLength) {
  return row.length === expectedLength ? row : row.slice(1);
}

function zipOdds(labels, odds, labelKey) {
  return labels
    .map((label, index) => ({
      [labelKey]: label,
      odds: odds[index] ?? "",
    }))
    .filter((item) => item[labelKey] && item.odds);
}

function reverseScore(score) {
  const parts = String(score || "").split(":");
  return parts.length === 2 ? `${parts[1]}:${parts[0]}` : score;
}

function findTableByLabel(html, label) {
  return (
    [...String(html || "").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
      .map((match) => match[0])
      .find((table) => cleanText(table).includes(label)) ?? ""
  );
}

function tableRows(table) {
  return [...String(table || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => extractCells(match[1]).map((cell) => cell.text))
    .filter((cells) => cells.length);
}

function parseInjuryPlayers(block) {
  return [
    ...String(block || "").matchAll(
      /<div\b[^>]*class=["']play["'][^>]*>[\s\S]*?<div\b[^>]*class=["']name["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<div\b[^>]*class=["']eventicon["'][^>]*>([\s\S]*?)<\/div>/gi,
    ),
  ]
    .map((match) => {
      const nameHtml = match[1] ?? "";
      return {
        number: textOfFirst(nameHtml, /<i\b[^>]*>([\s\S]*?)<\/i>/i),
        player:
          attrOfFirst(nameHtml, /<a\b[^>]*title=["']([^"']+)["']/i) ||
          textOfFirst(nameHtml, /<a\b[^>]*>([\s\S]*?)<\/a>/i),
        reason: cleanText(match[2]),
        url: attrOfFirst(nameHtml, /<a\b[^>]*href=["']([^"']+)["']/i),
      };
    })
    .filter((item) => item.player || item.reason);
}

function findFirstPositiveIndex(indexes) {
  const positive = indexes.filter((index) => index >= 0);
  return positive.length ? Math.min(...positive) : -1;
}

function appendLineupInjuries(lines, injuries, basic = {}) {
  lines.push("## 阵容伤病情况");
  const home = injuries?.home ?? [];
  const away = injuries?.away ?? [];
  if (!home.length && !away.length) {
    lines.push("- 未抓取到。");
    lines.push("");
    return;
  }
  lines.push("| 球队 | 号码 | 球员 | 情况 |");
  lines.push("| --- | ---: | --- | --- |");
  for (const item of home) {
    lines.push(
      `| ${basic.homeTeam || "主队"} | ${item.number || "-"} | ${item.player || "-"} | ${item.reason || "-"} |`,
    );
  }
  for (const item of away) {
    lines.push(
      `| ${basic.awayTeam || "客队"} | ${item.number || "-"} | ${item.player || "-"} | ${item.reason || "-"} |`,
    );
  }
  lines.push("");
}

export function buildAnalysisContext({
  detail,
  markets = {},
  sourceUrl,
  liveDetailUrl,
  historyWindow = "all",
}) {
  const {
    basic,
    teamStats,
    sameHomeAwayStats,
    leagueStandings = [],
    headToHead = [],
  } = detail;
  const lines = [];
  lines.push("# 角色设定");
  lines.push("");
  lines.push(
    "你是一位资深足球专家、足球数据分析师与赔率市场分析师，擅长结合球队基本面、近期状态、战术风格、伤停信息、历史交锋、技统数据，以及亚让、进球数、欧赔等博彩市场赔率变化，判断比赛走势并给出赛前预测。",
  );
  lines.push("");
  lines.push(
    "你的核心目标是提高长期预测正确率，而不是给出表面概率最高或赔率最低的选项。你的分析必须逻辑严密，所有结论都需要有基本面数据、技统数据或市场赔率信号支撑，不做无依据的主观臆断。",
  );
  lines.push("");
  lines.push(
    "当赔率热度、基本面印象和市场真实变化出现冲突时，你需要优先识别可能的诱盘、阻盘、降赔造热、升赔防范、盘口保护等信号，并明确说明哪些判断更有助于提高预测命中率。",
  );
  lines.push("");
  lines.push("最终推荐必须清晰给出倾向方向、信心等级和主要风险点。");
  lines.push("");
  lines.push("# 足球赔率分析任务");
  lines.push("");
  lines.push(
    "请基于以下比赛信息、技术统计、联赛积分、对赛往绩、多公司盘口变化、竞足与 Crown 全指数，生成完整分析报告。",
  );
  lines.push(
    "重点分析赔率变化、让球方向、大小球倾向、基本面与盘口是否一致，并给出推荐预测。",
  );
  lines.push("请明确区分：强信号、弱信号、风险点、最终建议。");
  lines.push(
    "注意：变化历史已过滤比赛开始后的滚球数据；如部分公司历史缺失，不得将缺失数据推断为市场共识。",
  );
  lines.push("");
  lines.push("## 分析指引");
  lines.push("");
  lines.push("### 公司权重");
  lines.push("");
  lines.push("**亚盘 / 大小球**");
  lines.push(
    "- 锚定：皇冠（先定盘口方向、变盘节奏与水位，再以其他公司是否跟随来验证）",
  );
  lines.push("- 主看：易胜博、平博（检验皇冠方向是否获 sharp 盘认同）");
  lines.push(
    "- 辅助：澳门、365bet、188（观察是否跟随皇冠；滞后或背离需单独说明）",
  );
  lines.push("- 本地：香港马会（单独标注本地偏差，不参与与国际盘简单平均）");
  lines.push("");
  lines.push("**胜平负（欧赔）**");
  lines.push("- 非亚洲赛事 主看：威廉、365bet、立博");
  lines.push("- 亚洲赛事 主看：在上述基础上提高澳门、皇冠权重");
  lines.push("- 辅助：Interwetten、皇冠、易胜博、平博、188");
  lines.push("- 本地：香港马会");
  lines.push("");
  lines.push("### 分析顺序");
  lines.push(
    "1. 基本面：技术统计、联赛积分、对赛往绩，判断两队真实强弱与进球预期。",
  );
  lines.push(
    "2. 亚盘/大小球：以皇冠为锚定盘口 → 易胜博、平博是否同向跟随 → 澳门、365、188 跟随或背离 → 香港马会单独看本地偏差。",
  );
  lines.push(
    "3. 胜平负：按赛事类型选欧赔主看公司定概率结构 → 辅助公司验证返还与变盘 → 与亚盘、大小球交叉验证。",
  );
  lines.push("4. 竞足、Crown 全指数作补充；缺失公司不得推断为市场共识。");
  lines.push("");
  lines.push("## 数据来源");
  if (liveDetailUrl) {
    lines.push(`- 比赛页（比赛信息/技术统计）：${liveDetailUrl}`);
  }
  lines.push(`- 分析页（联赛积分/对赛往绩/赔率）：${sourceUrl}`);
  lines.push("");
  lines.push("## 比赛信息");
  lines.push(`- ${basic.homeTeam} VS ${basic.awayTeam}`);
  lines.push(`- 赛事：${basic.league || "未知"}`);
  lines.push(`- 时间：${basic.kickoffTime || "未知"}`);
  lines.push(`- 状态：${basic.status || "未知"}`);
  lines.push(`- 全场比分：${basic.score?.display || "未知"}`);
  lines.push(`- 半场比分：${basic.score?.halfDisplay || "未知"}`);
  lines.push(`- 场地：${basic.venue || "未知"}`);
  lines.push(
    `- 天气/温度：${basic.weather || "未知"}，${basic.temperature || "未知"}`,
  );
  lines.push(
    `- 阵型：${basic.homeTeam} ${basic.homeFormation || "未知"} / ${basic.awayTeam} ${basic.awayFormation || "未知"}`,
  );
  lines.push(
    `- 主教练：${basic.homeCoach || "未知"} / ${basic.awayCoach || "未知"}`,
  );
  lines.push("");
  appendLineupInjuries(lines, detail.lineupInjuries, basic);
  appendStats(lines, "## 技术统计", teamStats, "全部场次");
  appendStats(lines, "", sameHomeAwayStats, "同主客");
  appendLeagueStandings(lines, leagueStandings);
  appendHeadToHead(lines, headToHead);
  appendCompanyList(lines, "## 亚让公司列表", markets.asianCompanies, "asian");
  appendCompanyList(
    lines,
    "## 进球数公司列表",
    markets.overUnderCompanies,
    "overUnder",
  );
  if (markets.asianHistories?.length) {
    appendGroupedHistories(
      lines,
      "## 亚让变化记录（指定公司）",
      markets.asianHistories,
      "asian",
      basic.kickoffTime,
      historyWindow,
    );
  } else {
    appendHistory(
      lines,
      "## 澳门亚让变化记录",
      markets.asianMacauHistory,
      "asian",
      basic.kickoffTime,
      historyWindow,
    );
  }
  if (markets.overUnderHistories?.length) {
    appendGroupedHistories(
      lines,
      "## 进球数变化记录（指定公司）",
      markets.overUnderHistories,
      "overUnder",
      basic.kickoffTime,
      historyWindow,
    );
  } else if (markets.overUnderMacauHistory) {
    appendHistory(
      lines,
      "## 澳门进球数变化记录",
      markets.overUnderMacauHistory,
      "overUnder",
      basic.kickoffTime,
      historyWindow,
    );
  }
  appendEuropeCompanyList(lines, markets.europeCompanies);
  appendEuropeHistories(
    lines,
    markets.europeHistories,
    basic.kickoffTime,
    historyWindow,
  );
  appendCrowFullIndex(lines, markets.crowFullIndex);
  appendJcOdds(lines, markets.jcOdds);
  if (markets.europeDataStatus) {
    lines.push("");
    lines.push("## 欧赔数据状态");
    lines.push(`- ${markets.europeDataStatus}`);
  }
  if (markets.jcOddsStatus) {
    lines.push("");
    lines.push("## 竞足数据状态");
    lines.push(`- ${markets.jcOddsStatus}`);
  }
  if (markets.crowFullIndexStatus) {
    lines.push("");
    lines.push("## Crown全指数状态");
    lines.push(`- ${markets.crowFullIndexStatus}`);
  }
  lines.push("");
  lines.push("## 输出要求");
  lines.push("1. 先给结论摘要。");
  lines.push(
    "2. 分别分析胜平负、让球、大小球；亚盘/大小球须说明皇冠锚定方向及其他公司跟随/背离情况。",
  );
  lines.push("3. 说明基本面与盘口是否一致。");
  lines.push("4. 给出推荐等级：谨慎 / 中等 / 较强。");
  lines.push(
    "5. 标注数据缺口和不确定性，尤其说明缺失公司历史记录对盘口判断的影响。",
  );
  lines.push("6. 不要把预测写成确定结果，推荐应服务于提高长期预测正确率。");
  return lines.join("\n");
}

export function buildReviewContext({
  detail,
  markets = {},
  sourceUrl,
  liveDetailUrl,
  historyWindow = "all",
}) {
  const {
    basic,
    teamStats,
    sameHomeAwayStats,
    leagueStandings = [],
    headToHead = [],
  } = detail;
  const lines = [];
  lines.push("# 角色设定");
  lines.push("");
  lines.push(
    "你是一位资深足球复盘分析师，擅长用赛后最新数据、赛前末盘和多公司赔率变化，复盘赛前判断是否与真实走势一致。",
  );
  lines.push("");
  lines.push(
    "你的核心目标是校准长期预测模型：判断原分析中的强信号是否兑现，识别误判来源，并给出后续修正建议。不要把单场结果简单归因于运气，也不要因为赛果倒推确定性结论。",
  );
  lines.push("");
  lines.push("# 足球赔率复盘任务");
  lines.push("");
  lines.push(
    "请基于以下最新赛果与赔率数据，复盘是否与赛前分析一致，并说明哪些判断被验证、哪些判断出现偏差。",
  );
  lines.push(
    "重点对照亚让、大小球、欧赔、竞足和 Crown 全指数的赛前信号，识别末盘方向、市场分歧和结果之间的关系。",
  );
  lines.push(
    "注意：变化历史已过滤比赛开始后的滚球数据；如部分公司历史缺失，不得将缺失数据推断为市场共识。",
  );
  lines.push("");
  lines.push("## 复盘指引");
  lines.push("");
  lines.push("1. 先提炼原分析结论，再用最新数据验证是否兑现。");
  lines.push("2. 分别复盘亚让、大小球、欧赔与竞足数据，不要只看赛果。");
  lines.push("3. 明确区分：判断正确点、判断偏差点、数据噪音、后续修正建议。");
  lines.push("4. 如赛果与盘口方向相反，优先检查末盘水位、公司分歧和基本面遗漏。");
  lines.push("");
  lines.push("## 数据来源");
  if (liveDetailUrl) {
    lines.push(`- 比赛页（比赛信息/技术统计）：${liveDetailUrl}`);
  }
  lines.push(`- 分析页（联赛积分/对赛往绩/赔率）：${sourceUrl}`);
  lines.push("");
  lines.push("## 比赛信息");
  lines.push(`- ${basic.homeTeam} VS ${basic.awayTeam}`);
  lines.push(`- 赛事：${basic.league || "未知"}`);
  lines.push(`- 时间：${basic.kickoffTime || "未知"}`);
  lines.push(`- 状态：${basic.status || "未知"}`);
  lines.push(`- 全场比分：${basic.score?.display || "未知"}`);
  lines.push(`- 半场比分：${basic.score?.halfDisplay || "未知"}`);
  lines.push(`- 场地：${basic.venue || "未知"}`);
  lines.push(
    `- 天气/温度：${basic.weather || "未知"}，${basic.temperature || "未知"}`,
  );
  lines.push(
    `- 阵型：${basic.homeTeam} ${basic.homeFormation || "未知"} / ${basic.awayTeam} ${basic.awayFormation || "未知"}`,
  );
  lines.push(
    `- 主教练：${basic.homeCoach || "未知"} / ${basic.awayCoach || "未知"}`,
  );
  lines.push("");
  appendLineupInjuries(lines, detail.lineupInjuries, basic);
  appendStats(lines, "## 技术统计", teamStats, "全部场次");
  appendStats(lines, "", sameHomeAwayStats, "同主客");
  appendLeagueStandings(lines, leagueStandings);
  appendHeadToHead(lines, headToHead);
  appendCompanyList(lines, "## 亚让公司列表", markets.asianCompanies, "asian");
  appendCompanyList(
    lines,
    "## 进球数公司列表",
    markets.overUnderCompanies,
    "overUnder",
  );
  if (markets.asianHistories?.length) {
    appendGroupedHistories(
      lines,
      "## 亚让变化记录（指定公司）",
      markets.asianHistories,
      "asian",
      basic.kickoffTime,
      historyWindow,
    );
  } else {
    appendHistory(
      lines,
      "## 澳门亚让变化记录",
      markets.asianMacauHistory,
      "asian",
      basic.kickoffTime,
      historyWindow,
    );
  }
  if (markets.overUnderHistories?.length) {
    appendGroupedHistories(
      lines,
      "## 进球数变化记录（指定公司）",
      markets.overUnderHistories,
      "overUnder",
      basic.kickoffTime,
      historyWindow,
    );
  } else if (markets.overUnderMacauHistory) {
    appendHistory(
      lines,
      "## 澳门进球数变化记录",
      markets.overUnderMacauHistory,
      "overUnder",
      basic.kickoffTime,
      historyWindow,
    );
  }
  appendEuropeCompanyList(lines, markets.europeCompanies);
  appendEuropeHistories(
    lines,
    markets.europeHistories,
    basic.kickoffTime,
    historyWindow,
  );
  appendCrowFullIndex(lines, markets.crowFullIndex);
  appendJcOdds(lines, markets.jcOdds);
  if (markets.europeDataStatus) {
    lines.push("");
    lines.push("## 欧赔数据状态");
    lines.push(`- ${markets.europeDataStatus}`);
  }
  if (markets.jcOddsStatus) {
    lines.push("");
    lines.push("## 竞足数据状态");
    lines.push(`- ${markets.jcOddsStatus}`);
  }
  if (markets.crowFullIndexStatus) {
    lines.push("");
    lines.push("## Crown全指数状态");
    lines.push(`- ${markets.crowFullIndexStatus}`);
  }
  lines.push("");
  lines.push("## 输出要求");
  lines.push("1. 原分析结论回顾。");
  lines.push("2. 最新赛果与赔率数据。");
  lines.push("3. 赛前判断是否兑现。");
  lines.push("4. 亚让复盘。");
  lines.push("5. 大小球复盘。");
  lines.push("6. 欧赔与市场变化复盘。");
  lines.push("7. 判断偏差来源。");
  lines.push("8. 后续模型修正建议。");
  return lines.join("\n");
}

async function fetchText(url, fetchImpl) {
  return fetchTextWithEncoding(url, fetchImpl);
}

async function fetchOptionalText(url, fetchImpl, encoding = "utf-8") {
  try {
    return {
      ok: true,
      text: await fetchTextWithEncoding(url, fetchImpl, encoding),
    };
  } catch (error) {
    return { ok: false, text: "", error: error.message };
  }
}

async function fetchTextWithEncoding(url, fetchImpl, encoding = "utf-8") {
  const response = await fetchImpl(url, {
    headers: buildRequestHeaders(url),
  });
  if (!response.ok) {
    throw new Error(`抓取失败：${url}，HTTP ${response.status}`);
  }
  if (typeof response.arrayBuffer !== "function") {
    return response.text();
  }
  const bytes = await response.arrayBuffer();
  return new TextDecoder(encoding).decode(bytes);
}

function buildOddsHistoryUrls(matchId, market) {
  const path = market === "asian" ? "handicap" : "overunder";
  return [...SELECTED_ASIAN_TOTAL_COMPANIES.entries()].map(
    ([companyId, company]) => ({
      companyId,
      company,
      url: `${TITAN_VIP_BASE}/changeDetail/${path}.aspx?id=${matchId}&companyID=${companyId}&l=0`,
    }),
  );
}

async function fetchOddsHistories(
  historyUrls,
  market,
  fetchImpl,
  kickoffTime = "",
) {
  const results = await Promise.all(
    historyUrls.map(async (item) => {
      const result = await fetchOptionalText(item.url, fetchImpl, "gb18030");
      return {
        ...item,
        ok: result.ok,
        error: result.error,
        records: result.ok
          ? parseOddsChangeHistory(
              result.text,
              market,
              item.companyId,
              kickoffTime,
            )
          : [],
      };
    }),
  );
  return results;
}

function applyLatestHistoryToCompanies(
  companies,
  historyGroups,
  market,
  kickoffTime,
) {
  if (!isKickoffInPast(kickoffTime)) return companies;
  const historyByCompany = new Map(
    historyGroups.map((group) => [group.companyId, group.records]),
  );
  return companies.map((company) => {
    const latest = historyByCompany.get(company.companyId)?.[0];
    if (!latest) {
      return {
        ...company,
        current: clearMarketCurrent(market),
        currentSource: "无赛前历史，已移除页面即时值",
      };
    }
    return {
      ...company,
      current:
        market === "asian"
          ? { home: latest.home, line: latest.line, away: latest.away }
          : { over: latest.home, line: latest.line, under: latest.away },
      currentSource: "赛前最后一条变化记录",
    };
  });
}

function clearMarketCurrent(market) {
  return market === "asian"
    ? { home: "", line: "", away: "" }
    : { over: "", line: "", under: "" };
}

function randomDelayMs([min, max], random) {
  const low = Number(min);
  const high = Number(max);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return 0;
  return Math.round(low + (high - low) * random());
}

function normalizeConcurrency(concurrency) {
  const count = Math.floor(Number(concurrency));
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCompanyOdds(script, varName, company) {
  const literal = extractArrayLiteral(script, varName);
  if (!literal) return [];
  const rows = parseArrayLiteral(literal);
  return rows
    .filter((row) => isPreMatchPhase(row[0]))
    .map((row) => ({
      company,
      phase: value(row[0]),
      score: `${value(row[1])}:${value(row[2])}`,
      asianHandicap: {
        opening: {
          home: value(row[3]),
          line: handicapName(row[4]),
          away: value(row[5]),
        },
        current: {
          home: value(row[12]),
          line: handicapName(row[13]),
          away: value(row[14]),
        },
      },
      totalGoals: {
        opening: {
          over: value(row[15]),
          line: value(row[16]),
          under: value(row[17]),
        },
        current: {
          over: value(row[21]),
          line: value(row[22]),
          under: value(row[23]),
        },
      },
      europe: {
        opening: {
          home: value(row[27]),
          draw: value(row[28]),
          away: value(row[29]),
        },
        current: {
          home: value(row[33]),
          draw: value(row[34]),
          away: value(row[35]),
        },
      },
    }));
}

function isPreMatchPhase(phase) {
  return ["早餐", "未开场"].includes(value(phase));
}

function extractArrayLiteral(script, varName) {
  const startMatch = String(script || "").match(
    new RegExp(`var\\s+${varName}\\s*=`, "i"),
  );
  const start = startMatch?.index ?? -1;
  const startToken = startMatch?.[0] ?? "";
  if (start < 0) return "";
  const arrayStart = script.indexOf("[", start + startToken.length);
  if (arrayStart < 0) return "";
  let depth = 0;
  let quote = "";
  for (let i = arrayStart; i < script.length; i += 1) {
    const char = script[i];
    const prev = script[i - 1];
    if (quote) {
      if (char === quote && prev !== "\\") quote = "";
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) return script.slice(arrayStart, i + 1);
  }
  throw new Error(`赔率变量 ${varName} 的数组没有正确结束。`);
}

function extractArrayFunctionStrings(script, varName) {
  const startMatch = String(script || "").match(
    new RegExp(`var\\s+${varName}\\s*=\\s*Array\\s*\\(`),
  );
  if (!startMatch) return [];
  const openParen = startMatch.index + startMatch[0].length - 1;
  let quote = "";
  let escape = false;
  let end = -1;

  for (let i = openParen + 1; i < script.length; i += 1) {
    const char = script[i];
    if (quote) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === ")") {
      end = i;
      break;
    }
  }

  const bodyEnd = end >= 0 ? end : script.length;
  const body = script.slice(openParen + 1, bodyEnd);
  return [...body.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) =>
    unescapeJsString(match[1]),
  );
}

function unescapeJsString(text) {
  return text.replace(/\\(["\\/bfnrt])/g, (_match, char) => {
    const escapes = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
    return escapes[char] ?? char;
  });
}

function parseLeagueStandingsTable(tableHtml) {
  const teamMatch = String(tableHtml).match(/<b>\[([^\]]+)\]([^<]+)<\/b>/i);
  const team = teamMatch
    ? `[${cleanText(teamMatch[1])}]${cleanText(teamMatch[2])}`
    : "";
  const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) =>
    [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
      cleanText(cell[1]),
    ),
  );

  let inFullTime = false;
  const fullTime = [];
  for (const cells of rows) {
    if (cells[0] === "全场") {
      inFullTime = true;
      continue;
    }
    if (cells[0] === "半场") break;
    if (!inFullTime) continue;
    if (!["总", "主", "客", "近6"].includes(cells[0]) || cells.length < 11) {
      continue;
    }
    fullTime.push({
      scope: cells[0],
      played: cells[1],
      win: cells[2],
      draw: cells[3],
      lose: cells[4],
      goalsFor: cells[5],
      goalsAgainst: cells[6],
      goalDiff: cells[7],
      points: cells[8],
      rank: cells[9],
      winRate: cells[10],
    });
  }

  return { team, fullTime };
}

function parseScriptArrayLiteral(html, varName) {
  const match = String(html || "").match(
    new RegExp(`var\\s+${varName}\\s*=\\s*\\[`, "i"),
  );
  if (!match) return [];
  const arrayStart = match.index + match[0].length - 1;
  let depth = 0;
  let quote = "";
  for (let i = arrayStart; i < html.length; i += 1) {
    const char = html[i];
    const prev = html[i - 1];
    if (quote) {
      if (char === quote && prev !== "\\") quote = "";
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      return parseArrayLiteral(html.slice(arrayStart, i + 1));
    }
  }
  return [];
}

function cleanTeamLabel(input) {
  return cleanText(String(input || "").replace(/\(中\)/g, ""));
}

function parseTeamStats(html, tableId) {
  const table = firstMatch(
    html,
    new RegExp(
      `<table[^>]*id=["']${tableId}["'][^>]*>([\\s\\S]*?)<\\/table>`,
      "i",
    ),
  );
  if (!table) return [];
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) =>
      [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
        cleanText(cell[1]),
      ),
    )
    .filter((cells) => cells.length === 5);

  return rows
    .filter((cells) => cells[2] && cells[2] !== " " && cells[2] !== "&nbsp;")
    .filter((cells) => !["近3场", "近10场"].includes(cells[0]))
    .map((cells) => ({
      metric: cells[2],
      homeLast3: cells[0],
      homeLast10: cells[1],
      awayLast3: cells[3],
      awayLast10: cells[4],
    }));
}

function parseArrayLiteral(literal) {
  const stack = [];
  let current = null;
  let token = "";
  let quote = "";
  let escape = false;

  const pushToken = () => {
    if (current === null) return;
    const text = token.trim();
    if (text || token.length > 0) current.push(text);
    token = "";
  };

  for (let i = 0; i < literal.length; i += 1) {
    const char = literal[i];
    if (quote) {
      if (escape) {
        token += char;
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === quote) {
        quote = "";
      } else {
        token += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[") {
      const next = [];
      if (current) current.push(next);
      stack.push(next);
      current = next;
      token = "";
      continue;
    }
    if (char === ",") {
      pushToken();
      continue;
    }
    if (char === "]") {
      pushToken();
      stack.pop();
      current = stack.at(-1) ?? current;
      continue;
    }
    token += char;
  }

  return current ?? [];
}

function appendStats(lines, title, stats, subtitle = "") {
  if (title) lines.push(title);
  if (subtitle) lines.push(`### ${subtitle}`);
  if (!stats?.length) {
    lines.push("- 未抓取到。");
    lines.push("");
    return;
  }
  lines.push("| 指标 | 主近3 | 主近10 | 客近3 | 客近10 |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const stat of stats) {
    lines.push(
      `| ${stat.metric} | ${stat.homeLast3} | ${stat.homeLast10} | ${stat.awayLast3} | ${stat.awayLast10} |`,
    );
  }
  lines.push("");
}

function appendLeagueStandings(lines, standings = []) {
  lines.push("## 联赛积分排名");
  if (!standings.length) {
    lines.push("- 未抓取到。");
    lines.push("");
    return;
  }
  for (const team of standings) {
    lines.push(`### ${team.team}`);
    lines.push(
      "| 范围 | 赛 | 胜 | 平 | 负 | 得 | 失 | 净 | 积分 | 排名 | 胜率 |",
    );
    lines.push(
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    );
    for (const row of team.fullTime) {
      lines.push(
        `| ${row.scope} | ${row.played} | ${row.win} | ${row.draw} | ${row.lose} | ${row.goalsFor} | ${row.goalsAgainst} | ${row.goalDiff} | ${row.points} | ${row.rank} | ${row.winRate} |`,
      );
    }
    lines.push("");
  }
}

function appendHeadToHead(lines, records = []) {
  lines.push("## 对赛往绩");
  lines.push("- 输出范围：最近 3 场。");
  if (!records.length) {
    lines.push("- 未抓取到。");
    lines.push("");
    return;
  }
  lines.push("| 日期 | 赛事 | 主队 | 客队 | 比分 |");
  lines.push("| --- | --- | --- | --- | ---: |");
  for (const record of records) {
    lines.push(
      `| ${record.date} | ${record.league} | ${record.homeTeam} | ${record.awayTeam} | ${record.score} |`,
    );
  }
  lines.push("");
}

function appendCompanyList(lines, title, companies = [], market) {
  lines.push("");
  lines.push(title);
  if (!companies.length) {
    lines.push("- 未抓取到。");
    return;
  }
  const selected = companies.slice(0, 8);
  if (market === "asian") {
    lines.push("| 公司 | 初盘 | 即时 | 详情 |");
    lines.push("| --- | --- | --- | --- |");
    for (const company of selected) {
      lines.push(
        `| ${company.company} | ${company.opening.home} / ${company.opening.line} / ${company.opening.away} | ${company.current.home} / ${company.current.line} / ${company.current.away} | ${company.detailUrl || "-"} |`,
      );
    }
    return;
  }
  lines.push("| 公司 | 初盘 | 即时 | 详情 |");
  lines.push("| --- | --- | --- | --- |");
  for (const company of selected) {
    lines.push(
      `| ${company.company} | ${company.opening.over} / ${company.opening.line} / ${company.opening.under} | ${company.current.over} / ${company.current.line} / ${company.current.under} | ${company.detailUrl || "-"} |`,
    );
  }
}

function appendEuropeCompanyList(lines, companies = []) {
  lines.push("");
  lines.push("## 欧赔公司列表");
  if (!companies.length) {
    lines.push("- 未抓取到。");
    return;
  }
  lines.push("| 公司 | 初赔 | 即时 | 返还率 | 凯利 | 更新时间 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const company of companies) {
    lines.push(
      `| ${company.company} | ${company.opening.home} / ${company.opening.draw} / ${company.opening.away} | ${company.current.home} / ${company.current.draw} / ${company.current.away} | ${company.opening.returnRate} -> ${company.current.returnRate} | ${company.kelly.home} / ${company.kelly.draw} / ${company.kelly.away} | ${company.updateTime || "-"} |`,
    );
  }
}

function appendGroupedHistories(
  lines,
  title,
  groups = [],
  market,
  kickoffTime = "",
  historyWindow = "all",
) {
  lines.push("");
  lines.push(title);
  lines.push(`- 输出范围：${describeHistoryWindow(historyWindow)}。`);
  if (!groups.length) {
    lines.push("- 未抓取到。");
    return;
  }
  for (const group of groups) {
    lines.push(`### ${group.company}`);
    if (!group.records.length) {
      lines.push(group.error ? `- 未抓取到：${group.error}` : "- 未抓取到。");
      continue;
    }
    lines.push(
      market === "asian"
        ? "| 时间 | 主水 | 盘口 | 客水 | 状态 |"
        : "| 时间 | 大球 | 盘口 | 小球 | 状态 |",
    );
    lines.push("| --- | ---: | --- | ---: | --- |");
    for (const item of selectHistoryRecords(
      group.records,
      kickoffTime,
      historyWindow,
    )) {
      lines.push(
        `| ${item.time} | ${item.home} | ${item.line} | ${item.away} | ${item.status} |`,
      );
    }
  }
}

function appendEuropeHistories(
  lines,
  histories = {},
  kickoffTime = "",
  historyWindow = "all",
) {
  lines.push("");
  lines.push("## 欧赔变化记录（指定公司）");
  lines.push(`- 输出范围：${describeHistoryWindow(historyWindow)}。`);
  const entries = Object.entries(histories);
  if (!entries.length) {
    lines.push("- 未抓取到。");
    return;
  }
  for (const [_companyId, records] of entries) {
    const company = records[0]?.company ?? "未知公司";
    lines.push(`### ${company}`);
    lines.push("| 时间 | 主胜 | 平 | 客胜 | 年份 |");
    lines.push("| --- | ---: | ---: | ---: | --- |");
    for (const item of selectHistoryRecords(
      records,
      kickoffTime,
      historyWindow,
    )) {
      lines.push(
        `| ${item.time} | ${item.home} | ${item.draw} | ${item.away} | ${item.year} |`,
      );
    }
  }
}

function appendJcOdds(lines, jcOdds) {
  lines.push("");
  lines.push("## 竞足数据");
  if (!jcOdds) {
    lines.push("- 未抓取到。");
    return;
  }
  lines.push("| 类型 | 初始 | 当前 |");
  lines.push("| --- | --- | --- |");
  lines.push(
    `| 胜平负 | ${formatWinDrawLose(jcOdds.winDrawLose.first)} | ${formatWinDrawLose(jcOdds.winDrawLose.current)} |`,
  );
  lines.push(
    `| 让胜平负（${jcOdds.handicapWinDrawLose.handicap}） | ${formatWinDrawLose(jcOdds.handicapWinDrawLose.first)} | ${formatWinDrawLose(jcOdds.handicapWinDrawLose.current)} |`,
  );
  lines.push("");
  lines.push("### 总进球");
  lines.push("| 总进球 | 赔率 |");
  lines.push("| --- | ---: |");
  for (const item of jcOdds.totalGoals) {
    lines.push(`| ${item.goals} | ${item.odds} |`);
  }
  lines.push("");
  lines.push("### 比分/波胆");
  appendCorrectScoreRows(lines, "主胜比分", jcOdds.correctScores.homeWin);
  appendCorrectScoreRows(lines, "平局比分", jcOdds.correctScores.draw);
  appendCorrectScoreRows(lines, "客胜比分", jcOdds.correctScores.awayWin);
}

function appendCrowFullIndex(lines, crowFullIndex) {
  lines.push("");
  lines.push("## Crown全指数");
  if (!crowFullIndex) {
    lines.push("- 未抓取到。");
    return;
  }
  lines.push("### 波胆");
  appendCorrectScoreRows(
    lines,
    "主胜比分",
    crowFullIndex.correctScores.homeWin,
  );
  appendCorrectScoreRows(lines, "平局比分", crowFullIndex.correctScores.draw);
  appendCorrectScoreRows(
    lines,
    "客胜比分",
    crowFullIndex.correctScores.awayWin,
  );
  lines.push("");
  lines.push("### 入球数");
  lines.push("| 区间 | 赔率 |");
  lines.push("| --- | ---: |");
  for (const item of crowFullIndex.goalBands) {
    lines.push(`| ${item.range} | ${item.odds} |`);
  }
  lines.push("");
  lines.push("### 总入球");
  lines.push("| 球队 | 大球 | 盘口 | 小球 |");
  lines.push("| --- | ---: | --- | ---: |");
  lines.push(
    `| 主队 | ${crowFullIndex.teamTotals.home.over} | ${crowFullIndex.teamTotals.home.line} | ${crowFullIndex.teamTotals.home.under} |`,
  );
  lines.push(
    `| 客队 | ${crowFullIndex.teamTotals.away.over} | ${crowFullIndex.teamTotals.away.line} | ${crowFullIndex.teamTotals.away.under} |`,
  );
}

function formatWinDrawLose(odds) {
  return `胜 ${odds.win || "-"} / 平 ${odds.draw || "-"} / 负 ${odds.lose || "-"}`;
}

function appendCorrectScoreRows(lines, title, rows) {
  if (!rows.length) return;
  lines.push(`#### ${title}`);
  lines.push("| 比分 | 赔率 |");
  lines.push("| --- | ---: |");
  for (const item of rows) {
    lines.push(`| ${item.score} | ${item.odds} |`);
  }
}

function appendHistory(
  lines,
  title,
  history = [],
  market,
  kickoffTime = "",
  historyWindow = "all",
) {
  lines.push("");
  lines.push(title);
  if (!history.length) {
    lines.push("- 未抓取到。");
    return;
  }
  lines.push(
    market === "asian"
      ? "| 时间 | 主水 | 盘口 | 客水 | 状态 |"
      : "| 时间 | 大球 | 盘口 | 小球 | 状态 |",
  );
  lines.push("| --- | ---: | --- | ---: | --- |");
  for (const item of selectHistoryRecords(
    history,
    kickoffTime,
    historyWindow,
  )) {
    lines.push(
      `| ${item.time} | ${item.home} | ${item.line} | ${item.away} | ${item.status} |`,
    );
  }
}

function extractCells(row) {
  return [...String(row).matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map(
    (match) => ({
      raw: `<td${match[1]}>${match[2]}</td>`,
      text: cleanText(match[2]),
    }),
  );
}

function normalizeCompany(text) {
  return cleanText(text)
    .replace(/\s+/g, "")
    .replace(/设置自定义.*$/, "");
}

function absolutizeVipUrl(href) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return `${TITAN_VIP_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
}

function refererFor(url) {
  const matchId = matchIdFromUrl(url);
  if (url.includes("vip.titan007.com/AsianOdds_n.aspx") && matchId)
    return buildAnalysisUrl(matchId);
  if (url.includes("vip.titan007.com/changeDetail/handicap.aspx") && matchId)
    return `${TITAN_VIP_BASE}/AsianOdds_n.aspx?id=${matchId}&l=0`;
  if (url.includes("vip.titan007.com/OverDown_n.aspx") && matchId)
    return `${TITAN_VIP_BASE}/AsianOdds_n.aspx?id=${matchId}&l=0`;
  if (url.includes("vip.titan007.com/changeDetail/overunder.aspx") && matchId)
    return `${TITAN_VIP_BASE}/OverDown_n.aspx?id=${matchId}&l=0`;
  if (url.includes("vip.titan007.com")) return "https://vip.titan007.com/";
  if (url.includes("1x2.titan007.com")) return "https://1x2.titan007.com/";
  if (url.includes("1x2d.titan007.com")) return "https://1x2.titan007.com/";
  if (url.includes("zq.titan007.com")) return "https://zq.titan007.com/";
  return "https://live.titan007.com/";
}

function matchIdFromUrl(url) {
  const parsed = new URL(url);
  return (
    parsed.searchParams.get("id") || firstMatch(parsed.pathname, /\/(\d{6,})/)
  );
}

function parseJcLeagueRecord(record) {
  const arr = record.split("^");
  const names = value(arr[3]).split(",");
  const subNames = value(arr[4]).split(",");
  const subName = subNames.length > 1 ? subNames[0] : "";
  return {
    leagueId: value(arr[0]),
    subLeagueId: value(arr[2]),
    name: `${names[0] || ""}${subName}`,
    color: value(arr[1]),
    url: value(arr[5]),
  };
}

function normalizeJcSaleDate(input) {
  if (!input) return "";
  const text = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`竞足销售日期无效：${input}。请使用 YYYY-MM-DD 格式。`);
  }
  return text;
}

function parseJcScheduleRecord(record, leagues) {
  const arr = record.split("^");
  const leagueId = value(arr[5]);
  const subLeagueId = value(arr[6]);
  const league = leagues.get(leagueKey(leagueId, subLeagueId));
  const homeNames = value(arr[8]).split(",");
  const awayNames = value(arr[10]).split(",");
  return {
    matchId: value(arr[0]),
    kickoffTime: parseJcDateTime(arr[1]),
    startTime: parseJcDateTime(arr[2]),
    state: value(arr[3]),
    stateName: JC_STATE_NAMES.get(value(arr[3])) ?? "",
    jcNo: value(arr[4]),
    leagueId,
    subLeagueId,
    league: league ? league.name : "",
    homeTeamId: value(arr[7]),
    homeTeam: homeNames[0] || "",
    awayTeamId: value(arr[9]),
    awayTeam: awayNames[0] || "",
    score: {
      home: value(arr[11]),
      away: value(arr[12]),
      halfHome: value(arr[13]),
      halfAway: value(arr[14]),
    },
    cards: {
      homeRed: value(arr[15]),
      awayRed: value(arr[16]),
      homeYellow: value(arr[17]),
      awayYellow: value(arr[18]),
    },
    ranking: {
      home: value(arr[19]),
      away: value(arr[20]),
    },
    saleDate: parseJcDate(arr[21]),
    firstGoal: value(arr[22]),
    isTurned: value(arr[23]),
  };
}

function leagueKey(leagueId, subLeagueId) {
  return `${leagueId}_${subLeagueId || ""}`;
}

function parseJcDateTime(raw) {
  const date = parseJcDateParts(raw);
  if (!date) return "";
  const [year, month, day, hour = 0, minute = 0, second = 0] = date;
  return `${year}-${pad2(month + 1)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

function parseJcDate(raw) {
  const date = parseJcDateParts(raw);
  if (!date) return "";
  const [year, month, day] = date;
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function parseJcDateParts(raw) {
  const parts = String(raw ?? "")
    .split(",")
    .map((part) => Number(part));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return parts;
}

function pad2(input) {
  return String(input).padStart(2, "0");
}

function matchStatusName(state) {
  const normalized = value(state);
  if (!normalized) return "";
  return JC_STATE_NAMES.get(normalized) ?? normalized;
}

function parseMatchScoreFromDetail(html) {
  const eventDetailData = pickScriptVar(html, "eventDetailData");
  const fullDisplay = firstMatch(
    eventDetailData,
    /比赛结束！\s*比分[：:]\s*(\d+\s*[-:]\s*\d+)/i,
  );
  const halfDisplay = firstMatch(
    eventDetailData,
    /上半场结束！\s*比分[：:]\s*(\d+\s*[-:]\s*\d+)/i,
  );
  if (!fullDisplay && !halfDisplay) return null;
  const full = splitScore(fullDisplay);
  const half = splitScore(halfDisplay);
  return {
    home: full.home,
    away: full.away,
    halfHome: half.home,
    halfAway: half.away,
    display: full.display,
    halfDisplay: half.display,
  };
}

function splitScore(score) {
  const match = String(score || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!match) {
    return { home: "", away: "", display: "" };
  }
  return {
    home: match[1],
    away: match[2],
    display: `${match[1]}-${match[2]}`,
  };
}

function pickScriptVar(html, name) {
  const match = String(html || "").match(
    new RegExp(
      `var\\s+${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(-?\\d+(?:\\.\\d+)?))`,
      "i",
    ),
  );
  if (!match) return "";
  return cleanText(match[1] || match[2] || match[3] || "");
}

function textOfFirst(html, regex) {
  return cleanText(firstMatch(html, regex));
}

function attrOfFirst(html, regex) {
  return cleanText(firstMatch(html || "", regex));
}

function firstMatch(text, regex) {
  const match = String(text || "").match(regex);
  return match ? match[1] || match[2] || "" : "";
}

function extractFormation(html) {
  const text = cleanText(html);
  const match = text.match(/\b\d-\d-\d(?:-\d)?\b/);
  return match ? match[0] : "";
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function handicapName(raw) {
  const number = Number(raw);
  if (!Number.isFinite(number)) return value(raw);
  if (number < 0)
    return `受${HANDICAP_NAMES[Math.abs(Math.trunc(number * 4))] ?? Math.abs(number)}`;
  return HANDICAP_NAMES[Math.trunc(number * 4)] ?? value(raw);
}

function value(input) {
  if (input === undefined || input === null || input === "") return "";
  return String(input);
}
