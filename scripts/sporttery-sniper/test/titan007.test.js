import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalysisContext,
  buildReviewContext,
  buildJcScheduleContext,
  buildOpenClawAnalysisPayload,
  buildOpenClawSchedulePayload,
  buildMarketUrls,
  buildRequestHeaders,
  createHumanLikeFetch,
  parseAnalysisHtml,
  parseLineupInjuries,
  parseDetailHtml,
  parseHeadToHeadRecords,
  parseLeagueStandings,
  parseCrowFullIndexData,
  parseEuropeOddsScript,
  parseJcOddsData,
  parseJcScheduleText,
  parseJcScheduleOddsText,
  parseMatchId,
  parseOddsChangeHistory,
  parseOddsCompanyList,
  parseOddsScript,
  parseHistoryWindow,
  selectHistoryRecords,
  fetchJcSchedule,
} from "../src/titan007.js";

const DETAIL_HTML = `
<html>
<head>
  <title>鹿岛鹿角 VS 神户胜利船(2026赛季日职联)-现场分析-新球体育-球探体育</title>
  <script>
    var scheduleID = 2990354;
    var strTime = '2026-06-06 13:00';
    var homeTeamName = '鹿岛鹿角';
    var guestTeamName = '神户胜利船';
  </script>
</head>
<body>
  <a class="LName">日职联</a>
  <span class="time">2026-06-06 13:00</span>
  <div class="row"><label>场地：<a class='place'>茨城县鹿岛球场</a></label><label>天气：间中有云</label><label>温度：24℃～25℃</label></div>
  <div class="homeN"><a>鹿岛鹿角</a> 4-4-2<a class='coach' title='鬼木达'>(主教练: 鬼木达)</a></div>
  <div class="guestN"><a class='coach' title='斯基贝'>(主教练: 斯基贝)</a><a>神户胜利船</a> 4-1-2-3</div>
  <div class="backupPlay hurtPlay">
    <div class="home">
      <div class='play'><div class='name'><i>4</i><a href='//info.titan007.com/cn/team/player/196/172821.html' target='_blank' title='荒木辽太郎'>荒木辽太郎</a></div><div class='eventicon'>膝关节损伤</div></div>
      <div class='play'><div class='name'><a href='//info.titan007.com/cn/team/player/196/172822.html' target='_blank' title='铃木优磨'>铃木优磨</a></div><div class='eventicon'>停赛</div></div>
    </div>
    <div class="bu_txt"><span class="center">伤停</span></div>
    <div class="guest">
      <div class='nodata'>暂无数据</div>
    </div>
  </div>
  <table id="techCountAll">
    <tr><td colspan="5" class="title">技统数据</td></tr>
    <tr><th>近3场</th><th>近10场</th><th>&nbsp;</th><th>近3场</th><th>近10场</th></tr>
    <tr><td>1</td><td>1.3</td><td class='graybg b'>进球</td><td><span class="red">2.7</span></td><td><span class="red">1.4</span></td></tr>
    <tr><td><span class="red">57.7%</span></td><td><span class="red">58.1%</span></td><td class='graybg b'>控球率</td><td>47.7%</td><td>53.5%</td></tr>
  </table>
</body>
</html>`;

const FINISHED_DETAIL_HTML = `
<html>
<head>
  <title>匈牙利 VS 哈萨克斯坦(2026赛季国际友谊)-现场分析-新球体育-球探体育</title>
  <script>
    var scheduleID = 2992890;
    var state = -1;
    var strTime = '2026-06-10 01:00';
    var homeTeamName = '匈牙利';
    var guestTeamName = '哈萨克斯坦';
    var eventDetailData = "2^0^0^0^0^0^2^0^0^0^^^^^^^^^上半场结束！比分：0-1^^^^!3^0^0^0^0^0^-1^0^0^0^^^^^^^^^比赛结束！ 比分：3-1^^^^";
  </script>
</head>
<body>
  <a class="LName">国际友谊</a>
  <span class="time">2026-06-10 01:00</span>
</body>
</html>`;

const ODDS_SCRIPT = `var sOdds=[['早餐',0,0,0.84,0,1.04,0.74,0,1.16,0.82,0,1.06,1.05,0.25,0.82,0.70,0.75,1.19,0.78,0.75,1.11,0.94,2.25,0.92,0.96,2.25,0.91,3.25,1.96,3.55,3.15,1.89,3.90,2.48,3.45,2.82,2.36,3.20,3.20,0,0,0,0,0,0,0],['09',0,0,0.70,0,1.20,0.74,0,1.16,0.82,0,1.06,0.95,0.25,0.95,0.70,0.75,1.19,0.78,0.75,1.11,0.94,2.25,0.92,0.96,2.25,0.91,3.25,1.96,3.55,3.15,1.89,3.90,2.00,3.45,3.80,2.36,3.20,3.20,0,0,0,0,0,0,0]];
var sOdds8=[['未开场',0,0,0.80,0,1.00,0.73,0,1.08,0.78,0,1.03,1.03,0.25,0.78,1.08,1,0.73,1.08,1,0.73,0.90,2.25,0.90,0.90,2.25,0.90,3.20,2.05,3.50,3.00,2.05,3.75,2.40,3.30,2.70,2.30,3.30,3.00,0,0,0,0,0,0,0]];`;

const ASIAN_LIST_HTML = `
<table id="odds">
  <tr><th>公司</th></tr>
  <tr>
    <td><input type="checkbox" name="oddsShow" data-id="1"></td>
    <td>澳*</td><td><span class='down'></span></td>
    <td title="2026-06-01 21:24">0.80</td>
    <td title="2026-06-01 21:24" goals="0">平手</td>
    <td title="2026-06-01 21:24">1.04</td>
    <td oddstype="wholeLastOdds">1.00</td>
    <td goals="0.25" oddstype="wholeLastOdds">平手/半球</td>
    <td oddstype="wholeLastOdds">0.84</td>
    <td><a href="/changeDetail/handicap.aspx?id=2990354&companyID=1&l=0">详</a></td>
  </tr>
</table>`;

const OVER_UNDER_LIST_HTML = `
<table id="odds">
  <tr>
    <td><input type="checkbox" name="oddsShow" data-id="1"></td>
    <td>澳*</td><td></td>
    <td title="2026-06-01 21:24">0.91</td>
    <td title="2026-06-01 21:24" goals="2.25">2/2.5</td>
    <td title="2026-06-01 21:24">0.89</td>
    <td oddstype="wholeLastOdds">0.90</td>
    <td goals="2.25" oddstype="wholeLastOdds">2/2.5</td>
    <td oddstype="wholeLastOdds">0.90</td>
    <td><a href="/changeDetail/overunder.aspx?id=2990354&companyID=1&l=0">详</a></td>
  </tr>
</table>`;

const CHANGE_HISTORY_HTML = `
<table>
  <tr><td>时间</td><td>比分</td><td>鹿岛鹿角</td><td>盘</td><td>神户胜利船</td><td>变化时间</td><td>状态</td></tr>
  <tr><td></td><td></td><td><font><b>0.88</b></font></td><td>平手/半球</td><td><font><b>0.94</b></font></td><td>6-6 13:06</td><td>滚</td></tr>
  <tr><td></td><td></td><td><font><b>0.99</b></font></td><td>平手/半球</td><td><font><b>0.85</b></font></td><td>6-6 13:03</td><td>即</td></tr>
  <tr><td></td><td></td><td><font><b>1.00</b></font></td><td>平手/半球</td><td><font><b>0.84</b></font></td><td>6-6 10:56</td><td>即</td></tr>
  <tr><td></td><td></td><td><font><b>0.80</b></font></td><td>平手</td><td><font><b>1.04</b></font></td><td>6-1 21:24</td><td>早</td></tr>
</table>`;

const HKJC_CHANGE_HISTORY_HTML = `
<table>
  <tr><td>横滨水手</td><td>盘</td><td>清水鼓动</td><td>变化时间</td><td>状态</td></tr>
  <tr><td>0.98</td><td>平手/半球</td><td>0.82</td><td>6-6 13:37</td><td>即</td></tr>
  <tr><td>0.93</td><td>平手/半球</td><td>0.87</td><td>6-6 09:23</td><td>即</td></tr>
  <tr><td>0.91</td><td>平手/半球</td><td>0.85</td><td>6-4 19:31</td><td>早</td></tr>
</table>`;

const ANALYSIS_HTML = `
<html>
<head>
  <title>横滨水手 VS 清水鼓动(2026赛季日职联)-数据分析-新球体育-球探体育</title>
  <script>
    var scheduleID = 2990632;
    var strTime = '2026-06-06 16:00';
    var hometeam = "横滨水手";
    var guestteam = "清水鼓动";
    var v_data = [['26-05-31',25,'日职联','#009900',204,'清水鼓动',196,'横滨水手',1,1,'0-0','',0,-2,-1,2990631,'10','0','//zq.titan007.com/cn/subleague.aspx?sclassid=25',0],['25-08-16',25,'日职联','#009900',204,'清水鼓动',196,'横滨水手',1,3,'0-2','',1,-2,1,2701833,'6','4','//zq.titan007.com/cn/subleague.aspx?sclassid=25',1],['25-04-16',25,'日职联','#009900',196,'横滨水手',204,'清水鼓动',2,3,'1-0','',-1,-2,1,2701696,'6','3','//zq.titan007.com/cn/subleague.aspx?sclassid=25',1],['22-07-02',25,'日职联','#009900',204,'清水鼓动(中)',196,'横滨水手',0,2,'0-3','',2,-2,1,0,'6','3','//zq.titan007.com/cn/subleague.aspx?sclassid=25',1]];
  </script>
</head>
<body>
  <a class="LName">日职联</a>
  <div>场地：日产体育场</a>天气：间中有云&nbsp;温度：19℃～20℃</div>
  <h2 class="fx_title2"><span>联赛积分排名</span></h2>
  <table cellspacing="0" cellpadding="0" width="100%" border="0">
    <tr>
      <td width='50%' valign=top><TABLE width=100% border=0 align=center cellPadding=3 cellSpacing=1 bgcolor=#CECECE>
        <tr align=middle class=red_t1>
          <td height=28 colspan=11 bgcolor="#FDEFD2"><a href='//zq.titan007.com/cn/team/Summary/196.html' target=_blank><font class=vander16 style="color:#000"><b>[日职联-7]横滨水手</b></font></a></td>
        </tr>
        <tr align=middle class="y_bg" bgcolor="#FAF1DE">
          <td width='43px' height=20>全场</td><td>赛</td><td>胜</td><td>平</td><td>负</td><td>得</td><td>失</td><td>净</td><td>积分</td><td>排名</td><td>胜率</td>
        </tr>
        <tr align=middle bgcolor=#FFECEC>
          <td height=20 bgcolor=#FFFFFF>总</td><td>18</td><td>6</td><td>2</td><td>10</td><td>28</td><td>29</td><td>-1</td><td>20</td><td>7</td><td>33.3%</td>
        </tr>
        <tr align=middle bgcolor=#FFECEC>
          <td bgcolor=#F5F5F5 height=20>主</td><td>9</td><td>2</td><td>2</td><td>5</td><td>11</td><td>15</td><td>-4</td><td>8</td><td>9</td><td>22.2%</td>
        </tr>
        <tr align=middle bgcolor=#FFECEC>
          <td height=20 bgcolor=#FFFFFF>半场</td><td>赛</td><td>胜</td><td>平</td><td>负</td><td>得</td><td>失</td><td>净</td><td>积分</td><td>排名</td><td>胜率</td>
        </tr>
      </TABLE></td>
      <td width='50%' valign=top><TABLE width=100% border=0 align=center cellPadding=3 cellSpacing=1 bgcolor=#B0D2E3>
        <tr align=middle class=blue_t1>
          <td height=28 colspan=11 bgcolor="#DCE8ED"><a href='//zq.titan007.com/cn/team/Summary/204.html' target=_blank><font class=vander16 style="color:#000"><b>[日职联-7]清水鼓动</b></font></a></td>
        </tr>
        <tr align=middle class=blue_t2>
          <td width='43px' height=20>全场</td><td>赛</td><td>胜</td><td>平</td><td>负</td><td>得</td><td>失</td><td>净</td><td>积分</td><td>排名</td><td>胜率</td>
        </tr>
        <tr align=middle bgcolor=#CCCCFF>
          <td height=20 bgcolor=#FFFFFF>总</td><td>18</td><td>4</td><td>8</td><td>6</td><td>19</td><td>21</td><td>-2</td><td>24</td><td>7</td><td>22.2%</td>
        </tr>
      </TABLE></td>
    </tr>
  </table>
</body>
</html>`;

const EUROPE_SCRIPT = `
var game=Array("115|154692609|William Hill|2.5|2.9|2.8|36.3|31.29|32.41|90.75|2|3|4|42.46|28.09|29.45|91.29|0.90|0.92|0.93|2026,06-1,06,04,40,00|威*(英国)|1|0|1.05|0.82|0.84","999|154000000|Other|9|9|9|0|0|0|0|8|8|8|0|0|0|0|0|0|0|2026,06-1,06,04,40,00|其他|0|0|0|0|0");
var gameDetail=Array("154692609^2.1|3.2|3.2|06-06 13:03|0.88|0.91|0.95|2026;2.15|3.25|3.1|06-06 12:34|0.90|0.92|0.93|2026;2.5|2.9|2.8|06-04 19:30|1.05|0.82|0.84|2026;");
`;

const JC_ODDS_JSON = `{
  "jcOdds": {
    "wlOdds": {
      "first": { "win": 2.11, "draw": 3.2, "lose": 2.92 },
      "live": { "win": 1.95, "draw": 3.28, "lose": 3.22 }
    },
    "sfOdds": {
      "rf": -1,
      "first": { "win": 4.8, "draw": 3.65, "lose": 1.55 },
      "live": { "win": 4.15, "draw": 3.55, "lose": 1.65 }
    },
    "goalOdds": {
      "live": { "g0": 11, "g1": 4.45, "g2": 3.3, "g3": 3.65, "g4": 6.2, "g5": 10, "g6": 17, "g7": 25 }
    },
    "scoreOdds": {
      "live": {
        "score10": 6.5, "score20": 9.5, "score21": 6.75, "scoreWin": 75,
        "score00": 11, "score11": 6, "score22": 13, "scoreDraw": 400,
        "score01": 9, "score02": 16, "score12": 10, "scoreLose": 100
      }
    }
  }
}`;

const CROW_FULL_INDEX_HTML = `
<div class='porletP' id='analy_sbAllOdds'>
  <h2 class=fx_title2>Crown全指数</h2>
  <table><tr><td><b>波胆</b></td><td>1:0</td><td>2:0</td><td>2:1</td><td>3:0</td><td>3:1</td><td>3:2</td><td>4:0</td><td>4:1</td><td>4:2</td><td>4:3</td><td>0:0</td><td>1:1</td><td>2:2</td><td>3:3</td><td>4:4</td></tr>
  <tr><td>主</td><td>5.6</td><td>8.7</td><td>7.8</td><td>20</td><td>17.5</td><td>30</td><td>55</td><td>50</td><td>75</td><td>150</td><td rowspan=2>7.8</td><td rowspan=2>5.2</td><td rowspan=2>15</td><td rowspan=2>75</td><td rowspan=2>200</td></tr>
  <tr><td>客</td><td>7.6</td><td>15.5</td><td>10.5</td><td>45</td><td>30</td><td>40</td><td>130</td><td>95</td><td>120</td><td>180</td></tr></table>
  <table><tr><td><b>入球数</b></td><td>0~1</td><td>2~3</td><td>4~6</td><td>7+</td></tr>
  <tr><td>1.93</td><td>0.94</td><td>2.85</td><td>28</td></tr></table>
  <table><tr><td><b>半全场</b></td><td>主/主</td></tr><tr><td></td><td>2.6</td></tr></table>
  <table><tr><td><b>总入球</b></td><td colspan=3>主队</td><td colspan=3>客队</td></tr>
  <tr><td>0.95</td><td>1.25</td><td>0.87</td><td>1.04</td><td>1</td><td>0.78</td></tr></table>
  <table><tr><td><b>先/后进球</b></td><td>主队先进球</td></tr><tr><td></td><td>0.79</td></tr></table>
</div>`;

const JC_SCHEDULE_TEXT =
  "75^#660000^^世界杯,世界盃^,^CupMatch.aspx?SclassID=75!1366^#4666bb^^国际友谊,國際友誼^,^CupMatch.aspx?SclassID=1366$2987713^2026,5,9,19,35,00^2026,5,9,19,35,00^2^周二201^1366^^896^中国,中國,中国^886^泰国,泰國,泰国^0^0^0^0^0^0^0^1^94^93^2026,5,9,00,00,00^0.5^0!2992890^2026,5,10,01,00,00^2026,5,10,01,00,00^0^周二202^1366^^745^匈牙利,匈牙利,匈牙利^763^哈萨克斯坦,哈薩克,哈萨克^0^0^^^0^0^0^0^42^109^2026,5,9,00,00,00^1.5^0";

const JC_SCHEDULE_ODDS_TEXT =
  "2987713^1.75^3.14^4.18^-1^3.82^3.11^1.83!2992890^1.16^5.55^11.50^-2^3.22^3.25^1.96";

const JC_SCHEDULE_MULTI_DAY_TEXT = `${JC_SCHEDULE_TEXT}!2906701^2026,5,12,03,00,00^2026,5,12,03,00,00^0^周四001^75^^819^墨西哥,墨西哥,墨西哥^803^南非,南非,南非^0^0^^^0^0^0^0^15^60^2026,5,11,00,00,00^1^0`;

test("从比赛链接或数字中识别比赛 ID", () => {
  assert.equal(parseMatchId("2990354"), "2990354");
  assert.equal(
    parseMatchId("https://live.titan007.com/detail/2990354cn.htm"),
    "2990354",
  );
});

test("解析竞足开售赛程文本", () => {
  const schedule = parseJcScheduleText(JC_SCHEDULE_TEXT);

  assert.equal(schedule.matches.length, 2);
  assert.deepEqual(schedule.leagues.get("1366"), {
    leagueId: "1366",
    subLeagueId: "",
    name: "国际友谊",
    color: "#4666bb",
    url: "CupMatch.aspx?SclassID=1366",
  });
  assert.deepEqual(schedule.matches[0], {
    matchId: "2987713",
    kickoffTime: "2026-06-09 19:35:00",
    startTime: "2026-06-09 19:35:00",
    state: "2",
    stateName: "待定",
    jcNo: "周二201",
    leagueId: "1366",
    subLeagueId: "",
    league: "国际友谊",
    homeTeamId: "896",
    homeTeam: "中国",
    awayTeamId: "886",
    awayTeam: "泰国",
    score: { home: "0", away: "0", halfHome: "0", halfAway: "0" },
    cards: { homeRed: "0", awayRed: "0", homeYellow: "0", awayYellow: "1" },
    ranking: { home: "94", away: "93" },
    saleDate: "2026-06-09",
    firstGoal: "0.5",
    isTurned: "0",
  });
});

test("解析并合并竞足指数", async () => {
  const odds = parseJcScheduleOddsText(JC_SCHEDULE_ODDS_TEXT);

  assert.deepEqual(odds.get("2987713"), {
    matchId: "2987713",
    standard: {
      first: { homeWin: "1.75", draw: "3.14", awayWin: "4.18" },
      current: { homeWin: "3.82", draw: "3.11", awayWin: "1.83" },
    },
    handicap: "-1",
  });

  const requestedUrls = [];
  const schedule = await fetchJcSchedule(async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      text: async () =>
        url.includes("odds_jc") ? JC_SCHEDULE_ODDS_TEXT : JC_SCHEDULE_TEXT,
    };
  });

  assert.equal(requestedUrls.length, 2);
  assert.equal(schedule.matches[0].jcOdds.handicap, "-1");
  assert.equal(schedule.matches[1].jcOdds.standard.current.homeWin, "3.22");
});

test("同步竞足赛程时按销售日过滤", async () => {
  const schedule = await fetchJcSchedule(
    async (url) => ({
      ok: true,
      text: async () =>
        url.includes("odds_jc") ? JC_SCHEDULE_ODDS_TEXT : JC_SCHEDULE_MULTI_DAY_TEXT,
    }),
    { saleDate: "2026-06-09" },
  );

  assert.equal(schedule.saleDate, "2026-06-09");
  assert.equal(schedule.matches.length, 2);
  assert.deepEqual(
    schedule.matches.map((match) => match.jcNo),
    ["周二201", "周二202"],
  );

  const laterSchedule = await fetchJcSchedule(
    async (url) => ({
      ok: true,
      text: async () =>
        url.includes("odds_jc") ? JC_SCHEDULE_ODDS_TEXT : JC_SCHEDULE_MULTI_DAY_TEXT,
    }),
    { saleDate: "2026-06-11" },
  );

  assert.equal(laterSchedule.matches.length, 1);
  assert.equal(laterSchedule.matches[0].jcNo, "周四001");
});

test("生成竞足开售赛程同步上下文", async () => {
  const schedule = {
    sourceUrl: "https://jc.titan007.com/index.aspx",
    matches: parseJcScheduleText(JC_SCHEDULE_TEXT).matches.map((match) => ({
      ...match,
      jcOdds: parseJcScheduleOddsText(JC_SCHEDULE_ODDS_TEXT).get(
        match.matchId,
      ),
    })),
  };
  const context = buildJcScheduleContext(schedule);

  assert.match(context, /# 竞足开售赛程/);
  assert.match(context, /共 2 场/);
  assert.match(context, /周二201/);
  assert.match(context, /中国 VS 泰国/);
  assert.match(context, /2987713/);
  assert.match(context, /3.82\/3.11\/1.83/);
});

test("生成 OpenClaw 赛程同步结构化数据", () => {
  const schedule = {
    sourceUrl: "https://jc.titan007.com/index.aspx",
    saleDate: "2026-06-09",
    matches: parseJcScheduleText(JC_SCHEDULE_TEXT).matches.map((match) => ({
      ...match,
      jcOdds: parseJcScheduleOddsText(JC_SCHEDULE_ODDS_TEXT).get(
        match.matchId,
      ),
    })),
  };

  const payload = buildOpenClawSchedulePayload(schedule, {
    generatedAt: "2026-06-09 11:10",
  });

  assert.equal(payload.kind, "openclaw.schedule");
  assert.equal(payload.saleDate, "2026-06-09");
  assert.equal(payload.generatedAt, "2026-06-09 11:10");
  assert.equal(payload.matches.length, 2);
  assert.deepEqual(payload.summary, {
    total: 2,
    notStarted: 2,
    inProgress: 0,
    finished: 0,
  });
  assert.deepEqual(payload.matches[0], {
    no: "周二201",
    matchId: "2987713",
    league: "国际友谊",
    leagueLevel: "排除",
    kickoffTime: "2026-06-09 19:35:00",
    status: "待定",
    homeTeam: "中国",
    score: "0-0",
    awayTeam: "泰国",
    analysisUrl: "https://zq.titan007.com/analysis/2987713cn.htm",
    handicap: "0.5",
    jcOdds: {
      matchId: "2987713",
      standard: {
        first: { homeWin: "1.75", draw: "3.14", awayWin: "4.18" },
        current: { homeWin: "3.82", draw: "3.11", awayWin: "1.83" },
      },
      handicap: "-1",
    },
  });
});

test("解析数据分析页基础比赛信息", () => {
  const match = parseDetailHtml(ANALYSIS_HTML);

  assert.deepEqual(match.basic, {
    matchId: "2990632",
    league: "日职联",
    kickoffTime: "2026-06-06 16:00",
    homeTeam: "横滨水手",
    awayTeam: "清水鼓动",
    venue: "日产体育场",
    weather: "间中有云",
    temperature: "19℃～20℃",
    homeFormation: "",
    awayFormation: "",
    homeCoach: "",
    awayCoach: "",
  });
});

test("解析详情页基础比赛信息和技统数据", () => {
  const match = parseDetailHtml(DETAIL_HTML);

  assert.deepEqual(match.basic, {
    matchId: "2990354",
    league: "日职联",
    kickoffTime: "2026-06-06 13:00",
    homeTeam: "鹿岛鹿角",
    awayTeam: "神户胜利船",
    venue: "茨城县鹿岛球场",
    weather: "间中有云",
    temperature: "24℃～25℃",
    homeFormation: "4-4-2",
    awayFormation: "4-1-2-3",
    homeCoach: "鬼木达",
    awayCoach: "斯基贝",
  });
  assert.deepEqual(match.teamStats[0], {
    metric: "进球",
    homeLast3: "1",
    homeLast10: "1.3",
    awayLast3: "2.7",
    awayLast10: "1.4",
  });
});

test("解析已完场详情页的比赛状态和赛果", () => {
  const detail = parseDetailHtml(FINISHED_DETAIL_HTML);

  assert.equal(detail.basic.status, "完");
  assert.deepEqual(detail.basic.score, {
    home: "3",
    away: "1",
    halfHome: "0",
    halfAway: "1",
    display: "3-1",
    halfDisplay: "0-1",
  });
});

test("解析皇冠和 365 的即时赔率", () => {
  const odds = parseOddsScript(ODDS_SCRIPT);

  assert.equal(odds.length, 2);
  assert.deepEqual(odds[0], {
    company: "Crow*",
    phase: "早餐",
    score: "0:0",
    asianHandicap: {
      opening: { home: "0.84", line: "平手", away: "1.04" },
      current: { home: "1.05", line: "平/半", away: "0.82" },
    },
    totalGoals: {
      opening: { over: "0.70", line: "0.75", under: "1.19" },
      current: { over: "0.94", line: "2.25", under: "0.92" },
    },
    europe: {
      opening: { home: "3.25", draw: "1.96", away: "3.55" },
      current: { home: "2.48", draw: "3.45", away: "2.82" },
    },
  });
});

test("构造 titan007 各盘口数据源 URL", () => {
  assert.deepEqual(buildMarketUrls("2990354"), {
    analysis: "https://zq.titan007.com/analysis/2990354cn.htm",
    liveDetail: "https://live.titan007.com/detail/2990354cn.htm",
    liveOdds: "https://livestatic.titan007.com/jsData/29/90/2990354.js",
    asianList: "https://vip.titan007.com/AsianOdds_n.aspx?id=2990354&l=0",
    asianMacauHistory:
      "https://vip.titan007.com/changeDetail/handicap.aspx?id=2990354&companyID=1&l=0",
    overUnderList: "https://vip.titan007.com/OverDown_n.aspx?id=2990354&l=0",
    overUnderMacauHistory:
      "https://vip.titan007.com/changeDetail/overunder.aspx?id=2990354&companyID=1&l=0",
    europeList: "https://1x2.titan007.com/oddslist/2990354.htm",
    europeData: "https://1x2d.titan007.com/2990354.js",
    jcAnalysisData:
      "https://zq.titan007.com/default/getAnalyData?sid=2990354&t=1",
    crowFullIndex: "https://zq.titan007.com/analysis/odds/2990354.htm",
  });
});

test("按盘口页面关系构造抓取请求头，动态替换比赛 ID", () => {
  const expectedUserAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

  assert.deepEqual(
    buildRequestHeaders(
      "https://vip.titan007.com/AsianOdds_n.aspx?id=2590898&l=0",
    ),
    {
      "user-agent": expectedUserAgent,
      referer: "https://zq.titan007.com/analysis/2590898cn.htm",
    },
  );
  assert.deepEqual(
    buildRequestHeaders(
      "https://vip.titan007.com/changeDetail/handicap.aspx?id=2590898&companyID=1&l=0",
    ),
    {
      "user-agent": expectedUserAgent,
      referer: "https://vip.titan007.com/AsianOdds_n.aspx?id=2590898&l=0",
    },
  );
  assert.deepEqual(
    buildRequestHeaders(
      "https://vip.titan007.com/OverDown_n.aspx?id=2590898&l=0",
    ),
    {
      "user-agent": expectedUserAgent,
      referer: "https://vip.titan007.com/AsianOdds_n.aspx?id=2590898&l=0",
    },
  );
  assert.deepEqual(
    buildRequestHeaders(
      "https://vip.titan007.com/changeDetail/overunder.aspx?id=2590898&companyID=1&l=0",
    ),
    {
      "user-agent": expectedUserAgent,
      referer: "https://vip.titan007.com/OverDown_n.aspx?id=2590898&l=0",
    },
  );
});

test("请求节流最多允许两个并发，并在新请求启动前加入随机等待", async () => {
  const events = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchImpl = async (url) => {
    events.push(`fetch:${url}`);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((done) => setTimeout(done, 25));
    inFlight -= 1;
    events.push(`done:${url}`);
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const throttledFetch = createHumanLikeFetch(fetchImpl, {
    delayRangeMs: [5, 6],
    random: () => 0,
    wait: async (ms) => events.push(`wait:${ms}`),
  });

  await Promise.all([
    throttledFetch("a"),
    throttledFetch("b"),
    throttledFetch("c"),
  ]);

  assert.equal(maxInFlight, 2);
  assert.deepEqual(events.filter((event) => event.startsWith("wait:")), [
    "wait:5",
    "wait:5",
  ]);
});

test("解析亚让和进球数公司列表，并按指定公司过滤", () => {
  assert.deepEqual(
    parseOddsCompanyList(
      `${ASIAN_LIST_HTML}<tr><td><input type="checkbox" name="oddsShow" data-id="99"></td><td>其他</td></tr>`,
      "asian",
    )[0],
    {
      market: "asian",
      companyId: "1",
      company: "澳门",
      rawCompany: "澳*",
      opening: {
        home: "0.80",
        line: "平手",
        away: "1.04",
        time: "2026-06-01 21:24",
      },
      current: { home: "1.00", line: "平手/半球", away: "0.84" },
      detailUrl:
        "https://vip.titan007.com/changeDetail/handicap.aspx?id=2990354&companyID=1&l=0",
    },
  );

  assert.deepEqual(parseOddsCompanyList(OVER_UNDER_LIST_HTML, "overUnder")[0], {
    market: "overUnder",
    companyId: "1",
    company: "澳门",
    rawCompany: "澳*",
    opening: {
      over: "0.91",
      line: "2/2.5",
      under: "0.89",
      time: "2026-06-01 21:24",
    },
    current: { over: "0.90", line: "2/2.5", under: "0.90" },
    detailUrl:
      "https://vip.titan007.com/changeDetail/overunder.aspx?id=2990354&companyID=1&l=0",
  });
});

test("解析单公司盘口变化记录，并过滤比赛开始后的滚球和开赛后数据", () => {
  assert.deepEqual(
    parseOddsChangeHistory(
      CHANGE_HISTORY_HTML,
      "asian",
      "1",
      "2026-06-06 13:00",
    ).slice(0, 2),
    [
      {
        market: "asian",
        companyId: "1",
        time: "6-6 10:56",
        score: "",
        home: "1.00",
        line: "平手/半球",
        away: "0.84",
        status: "即",
      },
      {
        market: "asian",
        companyId: "1",
        time: "6-1 21:24",
        score: "",
        home: "0.80",
        line: "平手",
        away: "1.04",
        status: "早",
      },
    ],
  );
});

const HKJC_OVER_UNDER_HISTORY_HTML = `
<table>
  <tr><td>大球</td><td>进球数</td><td>小球</td><td>变化时间</td><td>状态</td></tr>
  <tr><td>1.01</td><td>2.5</td><td>0.71</td><td>6-4 19:31</td><td>即</td></tr>
</table>`;

test("同时兼容 7 列标准格式和 5 列紧凑格式的盘口变化记录", () => {
  const kickoffTime = "2026-06-06 16:00";
  const expanded = parseOddsChangeHistory(
    CHANGE_HISTORY_HTML,
    "asian",
    "1",
    kickoffTime,
  );
  const compact = parseOddsChangeHistory(
    HKJC_CHANGE_HISTORY_HTML,
    "asian",
    "48",
    kickoffTime,
  );
  const mixedHtml = `${CHANGE_HISTORY_HTML}${HKJC_CHANGE_HISTORY_HTML}`;

  assert.ok(expanded.length > 0);
  assert.equal(compact.length, 3);
  assert.equal(
    parseOddsChangeHistory(mixedHtml, "asian", "mixed", kickoffTime).length,
    expanded.length + compact.length,
  );
  assert.equal(
    parseOddsChangeHistory(
      HKJC_OVER_UNDER_HISTORY_HTML,
      "overUnder",
      "48",
      "2026-06-06 16:00",
    ).length,
    1,
  );
});

test("解析香港马会 5 列紧凑格式的盘口变化记录", () => {
  assert.deepEqual(
    parseOddsChangeHistory(
      HKJC_CHANGE_HISTORY_HTML,
      "asian",
      "48",
      "2026-06-06 16:00",
    ),
    [
      {
        market: "asian",
        companyId: "48",
        time: "6-6 13:37",
        score: "",
        home: "0.98",
        line: "平手/半球",
        away: "0.82",
        status: "即",
      },
      {
        market: "asian",
        companyId: "48",
        time: "6-6 09:23",
        score: "",
        home: "0.93",
        line: "平手/半球",
        away: "0.87",
        status: "即",
      },
      {
        market: "asian",
        companyId: "48",
        time: "6-4 19:31",
        score: "",
        home: "0.91",
        line: "平手/半球",
        away: "0.85",
        status: "早",
      },
    ],
  );
});

test("解析欧赔 JS 数据并按指定公司过滤", () => {
  const europe = parseEuropeOddsScript(
    EUROPE_SCRIPT,
    undefined,
    "2026-06-06 13:00",
  );

  assert.equal(europe.companies.length, 1);
  assert.deepEqual(europe.companies[0], {
    market: "europe",
    companyId: "115",
    recordId: "154692609",
    company: "威廉",
    rawCompany: "威*(英国)",
    opening: { home: "2.5", draw: "2.9", away: "2.8", returnRate: "90.75" },
    current: { home: "2.15", draw: "3.25", away: "3.1", returnRate: "91.29" },
    kelly: { home: "0.90", draw: "0.92", away: "0.93" },
    updateTime: "2026,06-1,06,04,40,00",
  });
  assert.deepEqual(europe.histories["115"][0], {
    market: "europe",
    companyId: "115",
    company: "威廉",
    time: "06-06 12:34",
    home: "2.15",
    draw: "3.25",
    away: "3.1",
    year: "2026",
  });
});

test("解析变化历史窗口参数", () => {
  assert.equal(parseHistoryWindow("all"), "all");
  assert.equal(parseHistoryWindow("全部"), "all");
  assert.equal(parseHistoryWindow("3"), 3);
  assert.equal(parseHistoryWindow("15"), 15);
  assert.equal(parseHistoryWindow("5h"), 5);
  assert.throws(() => parseHistoryWindow("0"), /变化历史窗口无效/);
  assert.throws(() => parseHistoryWindow("1.5"), /变化历史窗口无效/);
});

test("历史记录可按窗口输出全部或限定小时数", () => {
  const records = [
    { time: "6-6 12:56", home: "2.25", draw: "3.5", away: "3.15" },
    { time: "6-6 06:00", home: "2.35", draw: "3.4", away: "3.05" },
    { time: "6-5 20:00", home: "2.45", draw: "3.3", away: "3.00" },
    { time: "6-1 21:24", home: "2.80", draw: "3.0", away: "2.60" },
  ];

  assert.deepEqual(
    selectHistoryRecords(records, "2026-06-06 13:00", "all").map(
      (item) => item.time,
    ),
    ["6-6 12:56", "6-6 06:00", "6-5 20:00", "6-1 21:24"],
  );
  assert.deepEqual(
    selectHistoryRecords(records, "2026-06-06 13:00", 15).map(
      (item) => item.time,
    ),
    ["6-6 12:56", "6-6 06:00", "6-1 21:24"],
  );
});

test("解析竞足胜平负、让胜平负、总进球和比分赔率", () => {
  assert.deepEqual(parseJcOddsData(JC_ODDS_JSON), {
    winDrawLose: {
      first: { win: "2.11", draw: "3.2", lose: "2.92" },
      current: { win: "1.95", draw: "3.28", lose: "3.22" },
    },
    handicapWinDrawLose: {
      handicap: "-1",
      first: { win: "4.8", draw: "3.65", lose: "1.55" },
      current: { win: "4.15", draw: "3.55", lose: "1.65" },
    },
    totalGoals: [
      { goals: "0", odds: "11" },
      { goals: "1", odds: "4.45" },
      { goals: "2", odds: "3.3" },
      { goals: "3", odds: "3.65" },
      { goals: "4", odds: "6.2" },
      { goals: "5", odds: "10" },
      { goals: "6", odds: "17" },
      { goals: "7+", odds: "25" },
    ],
    correctScores: {
      homeWin: [
        { score: "1-0", odds: "6.5" },
        { score: "2-0", odds: "9.5" },
        { score: "2-1", odds: "6.75" },
        { score: "胜其他", odds: "75" },
      ],
      draw: [
        { score: "0-0", odds: "11" },
        { score: "1-1", odds: "6" },
        { score: "2-2", odds: "13" },
        { score: "平其他", odds: "400" },
      ],
      awayWin: [
        { score: "0-1", odds: "9" },
        { score: "0-2", odds: "16" },
        { score: "1-2", odds: "10" },
        { score: "负其他", odds: "100" },
      ],
    },
  });
});

test("解析预计阵容里的伤停信息，不包含球员上一场评分", () => {
  assert.deepEqual(parseLineupInjuries(DETAIL_HTML), {
    home: [
      {
        number: "4",
        player: "荒木辽太郎",
        reason: "膝关节损伤",
        url: "//info.titan007.com/cn/team/player/196/172821.html",
      },
      {
        number: "",
        player: "铃木优磨",
        reason: "停赛",
        url: "//info.titan007.com/cn/team/player/196/172822.html",
      },
    ],
    away: [],
  });
  assert.equal(JSON.stringify(parseLineupInjuries(DETAIL_HTML)).includes("rating"), false);
});

test("解析分析页联赛积分排名，只保留全场数据", () => {
  const standings = parseLeagueStandings(ANALYSIS_HTML);

  assert.equal(standings.length, 2);
  assert.equal(standings[0].team, "[日职联-7]横滨水手");
  assert.deepEqual(standings[0].fullTime, [
    {
      scope: "总",
      played: "18",
      win: "6",
      draw: "2",
      lose: "10",
      goalsFor: "28",
      goalsAgainst: "29",
      goalDiff: "-1",
      points: "20",
      rank: "7",
      winRate: "33.3%",
    },
    {
      scope: "主",
      played: "9",
      win: "2",
      draw: "2",
      lose: "5",
      goalsFor: "11",
      goalsAgainst: "15",
      goalDiff: "-4",
      points: "8",
      rank: "9",
      winRate: "22.2%",
    },
  ]);
  assert.equal(standings[1].team, "[日职联-7]清水鼓动");
  assert.equal(standings[1].fullTime.length, 1);
});

test("解析分析页对赛往绩，只保留最近 3 场", () => {
  assert.deepEqual(parseHeadToHeadRecords(ANALYSIS_HTML, 3), [
    {
      date: "26-05-31",
      league: "日职联",
      homeTeam: "清水鼓动",
      awayTeam: "横滨水手",
      score: "0-0",
    },
    {
      date: "25-08-16",
      league: "日职联",
      homeTeam: "清水鼓动",
      awayTeam: "横滨水手",
      score: "0-2",
    },
    {
      date: "25-04-16",
      league: "日职联",
      homeTeam: "横滨水手",
      awayTeam: "清水鼓动",
      score: "1-0",
    },
  ]);
  assert.equal(parseAnalysisHtml(ANALYSIS_HTML).headToHead.length, 3);
});

test("解析 Crown 全指数中的波胆、入球数和总入球", () => {
  const data = parseCrowFullIndexData(CROW_FULL_INDEX_HTML);

  assert.deepEqual(data.correctScores.homeWin.slice(0, 2), [
    { score: "1:0", odds: "5.6" },
    { score: "2:0", odds: "8.7" },
  ]);
  assert.deepEqual(data.correctScores.draw.slice(0, 2), [
    { score: "0:0", odds: "7.8" },
    { score: "1:1", odds: "5.2" },
  ]);
  assert.deepEqual(data.correctScores.awayWin.slice(0, 2), [
    { score: "0:1", odds: "7.6" },
    { score: "0:2", odds: "15.5" },
  ]);
  assert.deepEqual(
    {
      goalBands: [
        { range: "0~1", odds: "1.93" },
        { range: "2~3", odds: "0.94" },
        { range: "4~6", odds: "2.85" },
        { range: "7+", odds: "28" },
      ],
      teamTotals: {
        home: { over: "0.95", line: "1.25", under: "0.87" },
        away: { over: "1.04", line: "1", under: "0.78" },
      },
    },
    {
      goalBands: data.goalBands,
      teamTotals: data.teamTotals,
    },
  );
});

test("生成可交给 Codex 的分析上下文", () => {
  const context = buildAnalysisContext({
    detail: {
      ...parseDetailHtml(DETAIL_HTML),
      ...parseAnalysisHtml(ANALYSIS_HTML),
    },
    liveDetailUrl: "https://live.titan007.com/detail/2990354cn.htm",
    markets: {
      asianCompanies: parseOddsCompanyList(ASIAN_LIST_HTML, "asian"),
      overUnderCompanies: parseOddsCompanyList(
        OVER_UNDER_LIST_HTML,
        "overUnder",
      ),
      asianMacauHistory: parseOddsChangeHistory(
        CHANGE_HISTORY_HTML,
        "asian",
        "1",
      ),
      europeCompanies: parseEuropeOddsScript(EUROPE_SCRIPT).companies,
      europeHistories: parseEuropeOddsScript(EUROPE_SCRIPT).histories,
      jcOdds: parseJcOddsData(JC_ODDS_JSON),
      crowFullIndex: parseCrowFullIndexData(CROW_FULL_INDEX_HTML),
    },
    sourceUrl: "https://zq.titan007.com/analysis/2990354cn.htm",
  });

  assert.match(context, /鹿岛鹿角 VS 神户胜利船/);
  assert.match(
    context,
    /比赛页（比赛信息\/技术统计）：https:\/\/live\.titan007\.com\/detail\/2990354cn\.htm/,
  );
  assert.match(
    context,
    /分析页（联赛积分\/对赛往绩\/赔率）：https:\/\/zq\.titan007\.com\/analysis\/2990354cn\.htm/,
  );
  assert.match(context, /## 技术统计/);
  assert.match(context, /## 联赛积分排名/);
  assert.match(context, /## 对赛往绩/);
  assert.match(context, /## 阵容伤病情况/);
  assert.match(context, /荒木辽太郎/);
  assert.match(context, /膝关节损伤/);
  assert.match(context, /26-05-31/);
  assert.doesNotMatch(context, /## 技统数据/);
  assert.match(context, /# 角色设定/);
  assert.match(context, /资深足球专家、足球数据分析师与赔率市场分析师/);
  assert.match(context, /诱盘、阻盘、降赔造热、升赔防范、盘口保护/);
  assert.match(context, /## 分析指引/);
  assert.match(context, /锚定：皇冠/);
  assert.match(context, /非亚洲赛事 主看：威廉、365bet、立博/);
  assert.match(context, /重点分析赔率变化/);
  assert.doesNotMatch(context, /## 赔率数据/);
  assert.doesNotMatch(context, /livestatic\.titan007\.com/);
  assert.match(context, /亚让公司列表/);
  assert.match(context, /澳门亚让变化记录/);
  assert.match(context, /欧赔公司列表/);
  assert.match(context, /威廉/);
  assert.match(context, /竞足数据/);
  assert.match(context, /比分\/波胆/);
  assert.match(context, /Crown全指数/);
  assert.doesNotMatch(context, /半全场：主\/主/);
});

test("生成可交给 Codex 的复盘上下文", () => {
  const context = buildReviewContext({
    detail: {
      ...parseDetailHtml(DETAIL_HTML),
      ...parseAnalysisHtml(ANALYSIS_HTML),
    },
    liveDetailUrl: "https://live.titan007.com/detail/2990354cn.htm",
    markets: {
      asianCompanies: parseOddsCompanyList(ASIAN_LIST_HTML, "asian"),
      overUnderCompanies: parseOddsCompanyList(
        OVER_UNDER_LIST_HTML,
        "overUnder",
      ),
      asianMacauHistory: parseOddsChangeHistory(
        CHANGE_HISTORY_HTML,
        "asian",
        "1",
      ),
      europeCompanies: parseEuropeOddsScript(EUROPE_SCRIPT).companies,
      europeHistories: parseEuropeOddsScript(EUROPE_SCRIPT).histories,
      jcOdds: parseJcOddsData(JC_ODDS_JSON),
      crowFullIndex: parseCrowFullIndexData(CROW_FULL_INDEX_HTML),
    },
    sourceUrl: "https://zq.titan007.com/analysis/2990354cn.htm",
    historyWindow: 15,
  });

  assert.match(context, /# 足球赔率复盘任务/);
  assert.match(context, /复盘是否与赛前分析一致/);
  assert.match(context, /最新赛果与赔率数据/);
  assert.match(context, /判断偏差来源/);
  assert.match(context, /输出范围：开赛前 15 小时内全部变化记录/);
  assert.match(context, /鹿岛鹿角 VS 神户胜利船/);
  assert.match(context, /亚让公司列表/);
  assert.match(context, /欧赔公司列表/);
});

test("复盘上下文展示已完场的全场比分和半场比分", () => {
  const context = buildReviewContext({
    detail: {
      ...parseDetailHtml(FINISHED_DETAIL_HTML),
      ...parseAnalysisHtml(ANALYSIS_HTML),
    },
    markets: {},
    sourceUrl: "https://zq.titan007.com/analysis/2992890cn.htm",
    liveDetailUrl: "https://live.titan007.com/detail/2992890cn.htm",
  });

  assert.match(context, /状态：完/);
  assert.match(context, /全场比分：3-1/);
  assert.match(context, /半场比分：0-1/);
});

test("生成 OpenClaw 单场分析结构化数据", () => {
  const data = {
    detail: {
      ...parseDetailHtml(DETAIL_HTML),
      ...parseAnalysisHtml(ANALYSIS_HTML),
    },
    liveDetailUrl: "https://live.titan007.com/detail/2990354cn.htm",
    sourceUrl: "https://zq.titan007.com/analysis/2990354cn.htm",
    markets: {
      asianCompanies: parseOddsCompanyList(ASIAN_LIST_HTML, "asian"),
      overUnderCompanies: parseOddsCompanyList(
        OVER_UNDER_LIST_HTML,
        "overUnder",
      ),
      asianHistories: [
        {
          companyId: "1",
          company: "澳门",
          ok: true,
          records: parseOddsChangeHistory(CHANGE_HISTORY_HTML, "asian", "1"),
        },
      ],
      overUnderHistories: [
        {
          companyId: "1",
          company: "澳门",
          ok: true,
          records: parseOddsChangeHistory(
            CHANGE_HISTORY_HTML,
            "overUnder",
            "1",
          ),
        },
      ],
      europeCompanies: parseEuropeOddsScript(EUROPE_SCRIPT).companies,
      europeHistories: parseEuropeOddsScript(EUROPE_SCRIPT).histories,
      jcOdds: parseJcOddsData(JC_ODDS_JSON),
      crowFullIndex: parseCrowFullIndexData(CROW_FULL_INDEX_HTML),
    },
  };

  const payload = buildOpenClawAnalysisPayload(data, {
    historyWindow: 15,
    generatedAt: "2026-06-09 17:00",
  });

  assert.equal(payload.kind, "openclaw.analysis");
  assert.equal(payload.generatedAt, "2026-06-09 17:00");
  assert.equal(payload.historyWindow, 15);
  assert.deepEqual(payload.match, {
    matchId: "2990354",
    league: "日职联",
    kickoffTime: "2026-06-06 13:00",
    homeTeam: "鹿岛鹿角",
    awayTeam: "神户胜利船",
    analysisUrl: "https://zq.titan007.com/analysis/2990354cn.htm",
    liveDetailUrl: "https://live.titan007.com/detail/2990354cn.htm",
  });
  assert.equal(payload.context.includes("# 足球赔率分析任务"), true);
  assert.equal(payload.markets.asianCompanies[0].company, "澳门");
  assert.equal(payload.markets.asianHistories[0].records.length, 3);
  assert.equal(payload.markets.europeCompanies[0].company, "威廉");
  assert.equal(payload.markets.jcOdds.winDrawLose.current.win, "1.95");
  assert.equal(payload.markets.crowFullIndex.correctScores.homeWin[0].score, "1:0");
  assert.deepEqual(payload.lineupInjuries.home[0], {
    number: "4",
    player: "荒木辽太郎",
    reason: "膝关节损伤",
    url: "//info.titan007.com/cn/team/player/196/172821.html",
  });
  assert.equal(payload.correctScoreOdds.crownFullIndex.homeWin[0].score, "1:0");
  assert.equal(payload.correctScoreOdds.jc.homeWin[0].score, "1-0");
});
