package com.example.pl_connect.matchdata;

import com.example.pl_connect.epl.EplService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds the same normalized match list the SPA used to assemble client-side:
 * classpath CSVs + current season replaced from API-Football when {@code FOOTBALL_API_KEY} is set.
 */
@Service
public class NormalizedMatchesService {

    private static final String SEASON_2024_25 = "2024/2025";
    private static final String SEASON_2025_26 = "2025/2026";
    private static final Pattern ROUND_TRAILING_NUMBER = Pattern.compile("(\\d+)\\s*$");
    private static final Pattern UK_DATE = Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{4})$");

    private final EplService eplService;
    private final FootballDataUkSyncService footballDataUkSyncService;
    private final ObjectMapper objectMapper;

    public NormalizedMatchesService(
            EplService eplService,
            FootballDataUkSyncService footballDataUkSyncService,
            ObjectMapper objectMapper) {
        this.eplService = eplService;
        this.footballDataUkSyncService = footballDataUkSyncService;
        this.objectMapper = objectMapper;
    }

    public static int currentSeasonOpeningYear() {
        LocalDate now = LocalDate.now();
        return now.getMonthValue() >= 7 ? now.getYear() : now.getYear() - 1;
    }

    public static String currentSeasonLabel() {
        int y = currentSeasonOpeningYear();
        return y + "/" + (y + 1);
    }

    public ArrayNode buildNormalizedMatches() throws IOException {
        List<NormMatch> combined = buildCombinedNormMatches();
        ArrayNode out = objectMapper.createArrayNode();
        for (NormMatch m : combined) {
            out.add(toJson(m));
        }
        return out;
    }

    public ArrayNode buildLeagueTableFromMatches(String seasonLabel) throws IOException {
        return buildLeagueTableFromList(buildCombinedNormMatches(), seasonLabel);
    }

    private List<NormMatch> buildCombinedNormMatches() throws IOException {
        List<NormMatch> merged = new ArrayList<>();
        merged.addAll(readCsvClasspathSafe("match-data/matches.2.csv"));
        merged.addAll(readCsvClasspathSafe("match-data/pl_matches_2024_25.csv"));
        merged.addAll(readCurrentSeasonE0Rows());

        Map<String, NormMatch> byKey = new LinkedHashMap<>();
        for (NormMatch m : merged) {
            String k = matchKey(m);
            NormMatch prev = byKey.get(k);
            if (prev == null) {
                byKey.put(k, m);
            } else {
                byKey.put(k, pickBetterDuplicate(prev, m));
            }
        }

        List<NormMatch> combined = new ArrayList<>(byKey.values());

        try {
            JsonNode pack = eplService.getSeasonMatches(null);
            JsonNode arr = pack.path("matches");
            String seasonLabel = pack.path("seasonLabel").asText("");
            if (arr.isArray() && arr.size() > 0 && !seasonLabel.isBlank()) {
                combined.removeIf(m -> seasonLabel.equals(m.season));
                for (JsonNode raw : arr) {
                    combined.add(fromApiFixtureJson(raw, seasonLabel));
                }
            }
        } catch (RestClientException ignored) {
            // No API key or upstream error — keep CSV-only data.
        }

        applyGameweekInference(combined);
        combined.sort(Comparator.comparing((NormMatch m) -> m.date).reversed());
        return combined;
    }

    private List<NormMatch> readCurrentSeasonE0Rows() {
        Path synced = footballDataUkSyncService.syncedE0Path();
        try {
            if (Files.exists(synced)) {
                return readCsvFile(synced);
            }
        } catch (IOException ignored) {
        }
        return readCsvClasspathSafe("match-data/football_data_E0_2526.csv");
    }

    private ArrayNode buildLeagueTableFromList(List<NormMatch> combined, String seasonLabel) {
        Map<String, TeamStandingRow> tableMap = new LinkedHashMap<>();
        for (NormMatch match : combined) {
            if (!seasonLabel.equals(match.season) || !isMatchCompleted(match)) {
                continue;
            }
            TeamStandingRow home = ensureStandingRow(tableMap, match.homeTeam);
            TeamStandingRow away = ensureStandingRow(tableMap, match.awayTeam);
            int hg = match.homeScore;
            int ag = match.awayScore;
            home.played++;
            away.played++;
            home.gf += hg;
            home.ga += ag;
            away.gf += ag;
            away.ga += hg;
            if (hg > ag) {
                home.won++;
                home.points += 3;
                away.lost++;
            } else if (ag > hg) {
                away.won++;
                away.points += 3;
                home.lost++;
            } else {
                home.draw++;
                away.draw++;
                home.points++;
                away.points++;
            }
        }

        List<TeamStandingRow> rows = new ArrayList<>(tableMap.values());
        rows.sort(Comparator
                .comparingInt((TeamStandingRow r) -> r.points).reversed()
                .thenComparingInt(r -> r.gf - r.ga).reversed()
                .thenComparingInt(r -> r.gf).reversed()
                .thenComparing(r -> r.name.toLowerCase(Locale.ROOT)));

        ArrayNode table = objectMapper.createArrayNode();
        int position = 1;
        for (TeamStandingRow row : rows) {
            ObjectNode out = objectMapper.createObjectNode();
            ObjectNode team = objectMapper.createObjectNode();
            team.put("id", Math.abs(row.name.hashCode()));
            team.put("name", row.name);
            out.set("team", team);
            out.put("position", position++);
            out.put("playedGames", row.played);
            out.put("won", row.won);
            out.put("draw", row.draw);
            out.put("lost", row.lost);
            out.put("goalsFor", row.gf);
            out.put("goalsAgainst", row.ga);
            out.put("goalDifference", row.gf - row.ga);
            out.put("points", row.points);
            table.add(out);
        }
        return table;
    }

    private static TeamStandingRow ensureStandingRow(Map<String, TeamStandingRow> map, String name) {
        return map.computeIfAbsent(name, TeamStandingRow::new);
    }

    private List<NormMatch> readCsvFile(Path path) throws IOException {
        List<NormMatch> rows = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreEmptyLines(true)
                    .setTrim(true)
                    .setAllowMissingColumnNames(true)
                    .build();
            try (CSVParser parser = CSVParser.parse(reader, format)) {
                for (CSVRecord rec : parser) {
                    NormMatch m = normalizeMatchRow(recordToMap(rec));
                    if (m != null) {
                        rows.add(m);
                    }
                }
            }
        }
        return rows;
    }

    private List<NormMatch> readCsvClasspathSafe(String location) {
        try {
            return readCsvClasspath(location);
        } catch (IOException ex) {
            return List.of();
        }
    }

    private List<NormMatch> readCsvClasspath(String location) throws IOException {
        ClassPathResource resource = new ClassPathResource(location);
        if (!resource.exists()) {
            return List.of();
        }
        List<NormMatch> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreEmptyLines(true)
                    .setTrim(true)
                    .setAllowMissingColumnNames(true)
                    .build();
            try (CSVParser parser = CSVParser.parse(reader, format)) {
                for (CSVRecord rec : parser) {
                    Map<String, String> map = recordToMap(rec);
                    NormMatch m = normalizeMatchRow(map);
                    if (m != null) {
                        rows.add(m);
                    }
                }
            }
        }
        return rows;
    }

    private static Map<String, String> recordToMap(CSVRecord rec) {
        Map<String, String> map = new LinkedHashMap<>();
        for (String h : rec.getParser().getHeaderNames()) {
            if (h == null) {
                continue;
            }
            try {
                map.put(h, rec.isMapped(h) ? rec.get(h) : "");
            } catch (IllegalArgumentException ex) {
                // duplicate or missing header mapping — skip
            }
        }
        return map;
    }

    private static String g(Map<String, String> row, String... keys) {
        for (String k : keys) {
            for (Map.Entry<String, String> e : row.entrySet()) {
                if (e.getKey() != null && e.getKey().equalsIgnoreCase(k)) {
                    String v = e.getValue();
                    return v == null ? "" : v.trim();
                }
            }
        }
        return "";
    }

    private NormMatch normalizeMatchRow(Map<String, String> row) {
        String dateLeague = nz(g(row, "Date", "date"));

        String homeTeamCsv = g(row, "home_team");
        String awayTeamCsv = g(row, "away_team");
        String dateCsv = g(row, "date");
        if (!homeTeamCsv.isEmpty() && !awayTeamCsv.isEmpty() && !dateCsv.isEmpty()) {
            int[] scores = parseScoreDashCell(g(row, "score", "Score"));
            if (scores == null) {
                return null;
            }
            String seasonNorm = normalizeSeason(nz(g(row, "season", "Season")));
            if (seasonNorm.isEmpty()) {
                seasonNorm = SEASON_2024_25;
            }
            Integer gw = parseGameweek(g(row, "gameweek", "GW", "Gameweek"), maxGameweekForSeason(seasonNorm));
            NormMatch m = new NormMatch();
            m.season = seasonNorm;
            m.date = dateCsv;
            m.homeTeam = homeTeamCsv;
            m.awayTeam = awayTeamCsv;
            m.homeScore = scores[0];
            m.awayScore = scores[1];
            m.gameweek = gw;
            m.status = "finished";
            m.kickoff = null;
            return m;
        }

        String homeTeamFd = g(row, "HomeTeam");
        String awayTeamFd = g(row, "AwayTeam");
        if (!homeTeamFd.isEmpty() && !awayTeamFd.isEmpty() && !dateLeague.isEmpty()) {
            Integer homeScore = parseScore(g(row, "FTHG"));
            Integer awayScore = parseScore(g(row, "FTAG"));
            boolean finished = homeScore != null && awayScore != null;
            NormMatch m = new NormMatch();
            m.season = SEASON_2025_26;
            m.date = parseFootballDataUkDate(dateLeague);
            m.homeTeam = mapFootballDataTeamName(homeTeamFd);
            m.awayTeam = mapFootballDataTeamName(awayTeamFd);
            m.homeScore = finished ? homeScore : null;
            m.awayScore = finished ? awayScore : null;
            m.gameweek = null;
            m.status = finished ? "finished" : "scheduled";
            String time = g(row, "Time");
            m.kickoff = time.isEmpty() ? null : time;
            return m;
        }

        String home = g(row, "Home");
        String away = g(row, "Away");
        if (!home.isEmpty() && !away.isEmpty() && !dateLeague.isEmpty()) {
            Integer homeScore = parseScore(g(row, "Home Goals"));
            Integer awayScore = parseScore(g(row, "Away Goals"));
            if (homeScore == null || awayScore == null) {
                return null;
            }
            String seasonNorm = normalizeSeason(nz(g(row, "Season", "season")));
            if (seasonNorm.isEmpty()) {
                return null;
            }
            NormMatch m = new NormMatch();
            m.season = seasonNorm;
            m.date = dateLeague;
            m.homeTeam = home;
            m.awayTeam = away;
            m.homeScore = homeScore;
            m.awayScore = awayScore;
            m.gameweek = parseGameweek(g(row, "GW", "gameweek", "Gameweek"), maxGameweekForSeason(seasonNorm));
            m.status = "finished";
            m.kickoff = null;
            return m;
        }

        String team = g(row, "team");
        String opponent = g(row, "opponent");
        String venue = g(row, "venue");
        String dateVen = g(row, "date");
        if (!team.isEmpty() && !opponent.isEmpty() && !venue.isEmpty() && !dateVen.isEmpty()) {
            Integer gf = parseScore(g(row, "gf", "GF"));
            Integer ga = parseScore(g(row, "ga", "GA"));
            if (gf == null || ga == null) {
                return null;
            }
            boolean isHome = venue.toLowerCase(Locale.ROOT).equals("home");
            String seasonNorm = normalizeSeason(nz(g(row, "season", "Season")));
            if (seasonNorm.isEmpty()) {
                return null;
            }
            NormMatch m = new NormMatch();
            m.season = seasonNorm;
            m.date = dateVen;
            m.homeTeam = isHome ? team : opponent;
            m.awayTeam = isHome ? opponent : team;
            m.homeScore = isHome ? gf : ga;
            m.awayScore = isHome ? ga : gf;
            m.gameweek = parseGameweek(g(row, "GW", "gameweek", "Gameweek"), maxGameweekForSeason(seasonNorm));
            m.status = "finished";
            m.kickoff = null;
            return m;
        }

        return null;
    }

    private NormMatch fromApiFixtureJson(JsonNode raw, String seasonLabel) {
        NormMatch m = new NormMatch();
        m.season = seasonLabel;
        m.date = raw.path("date").asText("");
        m.homeTeam = raw.path("homeTeam").asText("");
        m.awayTeam = raw.path("awayTeam").asText("");
        m.status = raw.path("status").asText("scheduled");
        JsonNode gwk = raw.get("gameweek");
        if (gwk != null && !gwk.isNull() && gwk.isNumber()) {
            m.gameweek = gwk.asInt();
        } else {
            m.gameweek = null;
        }
        JsonNode hs = raw.get("homeScore");
        JsonNode as = raw.get("awayScore");
        m.homeScore = (hs == null || hs.isNull()) ? null : hs.asInt();
        m.awayScore = (as == null || as.isNull()) ? null : as.asInt();
        JsonNode ko = raw.get("kickoff");
        m.kickoff = (ko == null || ko.isNull() || ko.asText("").isBlank()) ? null : ko.asText();
        return m;
    }

    private ObjectNode toJson(NormMatch m) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("season", m.season);
        n.put("date", m.date);
        n.put("homeTeam", m.homeTeam);
        n.put("awayTeam", m.awayTeam);
        if (m.homeScore == null) {
            n.putNull("homeScore");
        } else {
            n.put("homeScore", m.homeScore);
        }
        if (m.awayScore == null) {
            n.putNull("awayScore");
        } else {
            n.put("awayScore", m.awayScore);
        }
        if (m.gameweek == null) {
            n.putNull("gameweek");
        } else {
            n.put("gameweek", m.gameweek);
        }
        n.put("status", m.status);
        if (m.kickoff == null) {
            n.putNull("kickoff");
        } else {
            n.put("kickoff", m.kickoff);
        }
        return n;
    }

    private static String nz(String s) {
        return s == null ? "" : s.trim();
    }

    private static Integer parseScore(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            double d = Double.parseDouble(raw.trim());
            int v = (int) Math.round(d);
            return v;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static int[] parseScoreDashCell(String scoreRaw) {
        if (scoreRaw == null || scoreRaw.isBlank()) {
            return null;
        }
        String[] parts = scoreRaw.trim().split("\\s*[\\u2013\\-]\\s*");
        if (parts.length != 2) {
            return null;
        }
        Integer h = parseScore(parts[0]);
        Integer a = parseScore(parts[1]);
        if (h == null || a == null) {
            return null;
        }
        return new int[]{h, a};
    }

    private static String parseFootballDataUkDate(String raw) {
        String s = raw == null ? "" : raw.trim();
        Matcher m = UK_DATE.matcher(s);
        if (!m.find()) {
            return s;
        }
        String dd = m.group(1).length() == 1 ? "0" + m.group(1) : m.group(1);
        String mm = m.group(2).length() == 1 ? "0" + m.group(2) : m.group(2);
        return m.group(3) + "-" + mm + "-" + dd;
    }

    private static String mapFootballDataTeamName(String raw) {
        return switch (raw.trim()) {
            case "Man City" -> "Manchester City";
            case "Man United" -> "Manchester Utd";
            case "Newcastle" -> "Newcastle Utd";
            case "Nott'm Forest" -> "Nott'ham Forest";
            case "Leeds" -> "Leeds United";
            default -> raw.trim();
        };
    }

    private static String normalizeSeason(String raw) {
        String s = raw == null ? "" : raw.trim();
        if ("2425".equals(s) || "2024-25".equals(s) || "2024-2025".equals(s)) {
            return SEASON_2024_25;
        }
        if ("2526".equals(s) || "2025-26".equals(s) || "2025-2026".equals(s)) {
            return SEASON_2025_26;
        }
        Matcher hy = Pattern.compile("^(\\d{4})-(\\d{2})$").matcher(s);
        if (hy.find()) {
            int y1 = Integer.parseInt(hy.group(1));
            int y2short = Integer.parseInt(hy.group(2));
            int y2 = y2short < 70 ? 2000 + y2short : 1900 + y2short;
            return y1 + "/" + y2;
        }
        return s;
    }

    private static Integer seasonOpeningYear(String season) {
        String s = season == null ? "" : season.trim();
        if (s.isEmpty()) {
            return null;
        }
        Matcher m4 = Pattern.compile("^(\\d{4})(?=[/-]|$)").matcher(s);
        if (m4.find()) {
            return Integer.parseInt(m4.group(1));
        }
        Matcher m2 = Pattern.compile("^(\\d{2})[/-](\\d{2})").matcher(s);
        if (m2.find()) {
            int y = Integer.parseInt(m2.group(1));
            return y >= 70 ? 1900 + y : 2000 + y;
        }
        return null;
    }

    private static int maxGameweekForSeason(String season) {
        Integer y = seasonOpeningYear(season);
        if (y != null && y >= 1992 && y <= 1994) {
            return 42;
        }
        return 38;
    }

    private static Integer parseGameweek(String raw, int maxAllowed) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            int n = Integer.parseInt(raw.trim());
            return (n >= 1 && n <= maxAllowed) ? n : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String matchKey(NormMatch m) {
        return m.season + "|" + m.date + "|" + m.homeTeam.toLowerCase(Locale.ROOT) + "|" + m.awayTeam.toLowerCase(Locale.ROOT);
    }

    private static boolean isMatchCompleted(NormMatch m) {
        return m != null
                && !"scheduled".equals(m.status)
                && m.homeScore != null
                && m.awayScore != null;
    }

    private static NormMatch pickBetterDuplicate(NormMatch prev, NormMatch next) {
        boolean pc = isMatchCompleted(prev);
        boolean nc = isMatchCompleted(next);
        if (nc && !pc) {
            return next;
        }
        if (pc && !nc) {
            return prev;
        }
        boolean pgw = prev.gameweek != null;
        boolean ngw = next.gameweek != null;
        if (pc && nc) {
            if (ngw && !pgw) {
                return next;
            }
            if (pgw && !ngw) {
                return prev;
            }
            return next;
        }
        if (ngw && !pgw) {
            return next;
        }
        if (pgw && !ngw) {
            return prev;
        }
        return next;
    }

    private void applyGameweekInference(List<NormMatch> matches) {
        Map<String, List<NormMatch>> bySeason = new LinkedHashMap<>();
        for (NormMatch m : matches) {
            bySeason.computeIfAbsent(m.season, k -> new ArrayList<>()).add(m);
        }
        for (List<NormMatch> arr : bySeason.values()) {
            inferFinishedGameweeks(arr);
            assignScheduledGameweeks(arr);
        }
    }

    private void inferFinishedGameweeks(List<NormMatch> allSeasonMatches) {
        if (allSeasonMatches.isEmpty()) {
            return;
        }
        int maxGw = maxGameweekForSeason(allSeasonMatches.get(0).season);
        Map<String, Set<Integer>> teamGws = new HashMap<>();
        for (NormMatch m : allSeasonMatches) {
            if (!isMatchCompleted(m) || m.gameweek == null) {
                continue;
            }
            addTeamGw(teamGws, m.homeTeam, m.gameweek);
            addTeamGw(teamGws, m.awayTeam, m.gameweek);
        }
        List<NormMatch> toInfer = new ArrayList<>();
        for (NormMatch m : allSeasonMatches) {
            if (isMatchCompleted(m) && m.gameweek == null) {
                toInfer.add(m);
            }
        }
        toInfer.sort(Comparator
                .comparing((NormMatch m) -> m.date)
                .thenComparing(m -> m.homeTeam));
        for (NormMatch m : toInfer) {
            int g = 1;
            while (g <= maxGw) {
                Set<Integer> hs = teamGws.getOrDefault(m.homeTeam, new HashSet<>());
                Set<Integer> as = teamGws.getOrDefault(m.awayTeam, new HashSet<>());
                if (!hs.contains(g) && !as.contains(g)) {
                    break;
                }
                g++;
            }
            int gw = Math.min(g, maxGw);
            m.gameweek = gw;
            addTeamGw(teamGws, m.homeTeam, gw);
            addTeamGw(teamGws, m.awayTeam, gw);
        }
    }

    private void assignScheduledGameweeks(List<NormMatch> allSeasonMatches) {
        if (allSeasonMatches.isEmpty()) {
            return;
        }
        int maxGw = maxGameweekForSeason(allSeasonMatches.get(0).season);
        Map<String, Set<Integer>> teamGws = new HashMap<>();
        for (NormMatch m : allSeasonMatches) {
            if (m.gameweek == null) {
                continue;
            }
            addTeamGw(teamGws, m.homeTeam, m.gameweek);
            addTeamGw(teamGws, m.awayTeam, m.gameweek);
        }
        List<NormMatch> scheduled = new ArrayList<>();
        for (NormMatch m : allSeasonMatches) {
            if ("scheduled".equals(m.status) && m.gameweek == null) {
                scheduled.add(m);
            }
        }
        scheduled.sort(Comparator
                .comparing((NormMatch m) -> m.date)
                .thenComparing(m -> m.homeTeam));
        for (NormMatch m : scheduled) {
            int g = 1;
            while (g <= maxGw) {
                Set<Integer> hs = teamGws.getOrDefault(m.homeTeam, new HashSet<>());
                Set<Integer> as = teamGws.getOrDefault(m.awayTeam, new HashSet<>());
                if (!hs.contains(g) && !as.contains(g)) {
                    break;
                }
                g++;
            }
            int gw = Math.min(g, maxGw);
            m.gameweek = gw;
            addTeamGw(teamGws, m.homeTeam, gw);
            addTeamGw(teamGws, m.awayTeam, gw);
        }
    }

    private static void addTeamGw(Map<String, Set<Integer>> teamGws, String team, int gw) {
        teamGws.computeIfAbsent(team, t -> new HashSet<>()).add(gw);
    }

    private static final class NormMatch {
        String season;
        String date;
        String homeTeam;
        String awayTeam;
        Integer homeScore;
        Integer awayScore;
        Integer gameweek;
        String status;
        String kickoff;
    }

    private static final class TeamStandingRow {
        final String name;
        int played;
        int won;
        int draw;
        int lost;
        int gf;
        int ga;
        int points;

        TeamStandingRow(String name) {
            this.name = name;
        }
    }
}
