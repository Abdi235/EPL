import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "../Frontend/node_modules/papaparse/papaparse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../Frontend/public");

const POS = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };

const CLUB_MAP = {
  "Man City": "Manchester City",
  "Man Utd": "Manchester United",
  "Nott'm Forest": "Nottingham Forest",
  Spurs: "Tottenham",
  Newcastle: "Newcastle",
  Leeds: "Leeds United",
};

function ageFromBirth(birth) {
  if (!birth) return "";
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function clubName(name) {
  return CLUB_MAP[name] || name;
}

function toEplRows(elements, teamsById) {
  return elements
    .filter((p) => p && p.first_name != null && Number(p.minutes) > 0)
    .map((p) => {
      const team = teamsById[p.team];
      const name =
        [p.first_name, p.second_name].filter(Boolean).join(" ").trim() ||
        p.web_name ||
        "";
      return {
        "Player Name": name,
        Club: clubName(team?.name || ""),
        Nationality: "",
        Position: POS[p.element_type] || "",
        Appearances: p.starts ?? "",
        Minutes: p.minutes ?? "",
        Goals: p.goals_scored ?? 0,
        Assists: p.assists ?? 0,
        Shots: "",
        "Shots On Target": "",
        "Conversion %": "",
        "Big Chances Missed": "",
        "Hit Woodwork": "",
        Offsides: "",
        Touches: "",
        Passes: "",
        "Successful Passes": "",
        "Passes%": "",
        Crosses: "",
        "Successful Crosses": "",
        "Crosses %": "",
        "fThird Passes": "",
        "Successful fThird Passes": "",
        "fThird Passes %": "",
        "Through Balls": "",
        Carries: "",
        "Progressive Carries": "",
        "Carries Ended with Goal": "",
        "Carries Ended with Assist": "",
        "Carries Ended with Shot": "",
        "Carries Ended with Chance": "",
        "Possession Won": "",
        Dispossessed: "",
        "Clean Sheets": p.clean_sheets ?? "",
        Clearances: "",
        Interceptions: "",
        Blocks: "",
        Tackles: p.tackles ?? "",
        "Ground Duels": "",
        "gDuels Won": "",
        "gDuels %": "",
        "Aerial Duels": "",
        "aDuels Won": "",
        "aDuels %": "",
        "Goals Conceded": p.goals_conceded ?? "",
        "xGoT Conceded": "",
        "Own Goals": p.own_goals ?? "",
        Fouls: "",
        "Yellow Cards": p.yellow_cards ?? 0,
        "Red Cards": p.red_cards ?? 0,
        Saves: p.saves ?? "",
        "Saves %": "",
        "Penalties Saved": p.penalties_saved ?? "",
        "Clearances Off Line": "",
        Punches: "",
        "High Claims": "",
        "Goals Prevented": "",
        Age: ageFromBirth(p.birth_date),
        Starts: p.starts ?? "",
        xG: p.expected_goals ?? "",
        xAG: p.expected_assists ?? "",
        "Penalty Goals": "",
      };
    })
    .filter((r) => r["Player Name"] && r.Club);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "PremierZone/1.0" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

const rawText = await fetchText(
  "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2025-26/players_raw.csv"
);
const teamsText = await fetchText(
  "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2025-26/teams.csv"
);
const rawParsed = Papa.parse(rawText, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
});
const teamsParsed = Papa.parse(teamsText, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true,
});
const teams2526 = Object.fromEntries(teamsParsed.data.map((t) => [t.id, t]));
const rows2526 = toEplRows(rawParsed.data, teams2526);
fs.writeFileSync(path.join(publicDir, "epl_player_stats_25_26.csv"), Papa.unparse(rows2526));
console.log(
  "2025/26",
  rows2526.length,
  [...new Set(rows2526.map((r) => r.Club))].sort().join(" | ")
);

const fplRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
  headers: { "User-Agent": "PremierZone/1.0" },
});
if (!fplRes.ok) throw new Error(`FPL bootstrap -> ${fplRes.status}`);
const fpl = await fplRes.json();
const teams2627 = Object.fromEntries(fpl.teams.map((t) => [t.id, t]));
const rows2627 = toEplRows(fpl.elements, teams2627);
fs.writeFileSync(path.join(publicDir, "epl_player_stats_26_27.csv"), Papa.unparse(rows2627));
console.log(
  "2026/27",
  rows2627.length,
  [...new Set(rows2627.map((r) => r.Club))].sort().join(" | ")
);
console.log(
  "top 26/27",
  rows2627
    .slice()
    .sort((a, b) => Number(b.Goals) - Number(a.Goals))
    .slice(0, 5)
    .map((r) => `${r["Player Name"]}:${r.Goals}`)
    .join("; ")
);
