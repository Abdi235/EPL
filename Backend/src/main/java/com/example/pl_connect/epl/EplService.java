package com.example.pl_connect.epl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.example.pl_connect.player.Player;
import com.example.pl_connect.player.PlayerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class EplService {
    private static final int EPL_LEAGUE_ID = 39;

    @Value("${football.api.base-url}")
    private String baseUrl;

    @Value("${football.api.key:}")
    private String apiKey;

    private final PlayerRepository playerRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public EplService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public JsonNode getStandings() {
        List<Player> players = playerRepository.findAll();

        Map<String, List<Player>> teamGroups = players.stream()
                .filter(player -> player.getTeam() != null && !player.getTeam().isBlank())
                .collect(Collectors.groupingBy(Player::getTeam));

        List<ObjectNode> teamRows = teamGroups.entrySet().stream()
                .map(entry -> createStandingRow(entry.getKey(), entry.getValue()))
                .sorted(Comparator
                        .comparingInt((ObjectNode row) -> row.path("points").asInt()).reversed()
                        .thenComparingInt((ObjectNode row) -> row.path("goalDifference").asInt()).reversed()
                        .thenComparing(row -> row.path("team").path("name").asText()))
                .collect(Collectors.toList());

        AtomicInteger rank = new AtomicInteger(1);
        ArrayNode table = objectMapper.createArrayNode();
        teamRows.forEach(row -> {
            row.put("position", rank.getAndIncrement());
            table.add(row);
        });

        ObjectNode standingsNode = objectMapper.createObjectNode();
        standingsNode.set("table", table);

        ArrayNode standingsArray = objectMapper.createArrayNode();
        standingsArray.add(standingsNode);

        ObjectNode result = objectMapper.createObjectNode();
        result.set("standings", standingsArray);
        result.put("source", "local-player-stats");
        result.put("note", "Standings are derived from player statistics in the local database.");
        return result;
    }

    public JsonNode getLiveMatches() {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/fixtures")
                .queryParam("live", EPL_LEAGUE_ID)
                .toUriString();
        JsonNode raw = executeRequest(url);
        return normalizeMatches(raw);
    }

    public JsonNode getRecentResults() {
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/fixtures")
                .queryParam("league", EPL_LEAGUE_ID)
                .queryParam("season", getCurrentSeason())
                .queryParam("last", 20)
                .toUriString();

        JsonNode raw = executeRequest(url);
        return normalizeMatches(raw);
    }

    /**
     * All fixtures for an EPL season (paginated upstream), normalized for the React app.
     *
     * @param seasonYear API-Football season year (e.g. 2025 for 2025/26). Null → current season.
     */
    public JsonNode getSeasonMatches(Integer seasonYearParam) {
        int seasonYear = seasonYearParam != null ? seasonYearParam : getCurrentSeason();
        ArrayNode allMatches = objectMapper.createArrayNode();
        int totalPages = 1;
        for (int page = 1; page <= totalPages; page++) {
            String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/fixtures")
                    .queryParam("league", EPL_LEAGUE_ID)
                    .queryParam("season", seasonYear)
                    .queryParam("page", page)
                    .toUriString();
            JsonNode raw = executeRequest(url);
            if (page == 1) {
                totalPages = Math.max(1, raw.path("paging").path("total").asInt(1));
            }
            JsonNode responseItems = raw.path("response");
            if (responseItems.isArray()) {
                for (JsonNode item : responseItems) {
                    ObjectNode m = normalizeFixtureToAppMatch(item, seasonYear);
                    if (m != null) {
                        allMatches.add(m);
                    }
                }
            }
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("seasonYear", seasonYear);
        result.put("seasonLabel", formatSeasonLabel(seasonYear));
        result.put("source", "api-football");
        result.set("matches", allMatches);
        return result;
    }

    /**
     * Official league table from API-Football for the given season year.
     *
     * @param seasonYear e.g. 2025 for 2025/26. Null → current season.
     */
    public JsonNode getLeagueTable(Integer seasonYearParam) {
        int seasonYear = seasonYearParam != null ? seasonYearParam : getCurrentSeason();
        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/standings")
                .queryParam("league", EPL_LEAGUE_ID)
                .queryParam("season", seasonYear)
                .toUriString();
        JsonNode raw = executeRequest(url);

        ArrayNode table = objectMapper.createArrayNode();
        JsonNode response0 = raw.path("response");
        if (response0.isArray() && !response0.isEmpty()) {
            JsonNode league = response0.get(0).path("league");
            JsonNode groups = league.path("standings");
            if (groups.isArray() && !groups.isEmpty()) {
                JsonNode rows = groups.get(0);
                if (rows.isArray()) {
                    for (JsonNode row : rows) {
                        ObjectNode out = objectMapper.createObjectNode();
                        JsonNode all = row.path("all");
                        JsonNode team = row.path("team");
                        ObjectNode teamNode = objectMapper.createObjectNode();
                        teamNode.put("id", team.path("id").asInt());
                        teamNode.put("name", team.path("name").asText(""));
                        out.set("team", teamNode);
                        out.put("position", row.path("rank").asInt());
                        out.put("playedGames", all.path("played").asInt());
                        out.put("won", all.path("win").asInt());
                        out.put("draw", all.path("draw").asInt());
                        out.put("lost", all.path("lose").asInt());
                        JsonNode goals = all.path("goals");
                        int gf = goals.path("for").asInt();
                        int ga = goals.path("against").asInt();
                        out.put("goalsFor", gf);
                        out.put("goalsAgainst", ga);
                        int gd = row.path("goalsDiff").isMissingNode()
                                ? gf - ga
                                : row.path("goalsDiff").asInt();
                        out.put("goalDifference", gd);
                        out.put("points", row.path("points").asInt());
                        table.add(out);
                    }
                }
            }
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("seasonYear", seasonYear);
        result.put("seasonLabel", formatSeasonLabel(seasonYear));
        result.put("source", "api-football");
        result.set("table", table);
        return result;
    }

    public Map<String, Object> getHealthStatus() {
        Map<String, Object> status = new HashMap<>();
        boolean hasApiKey = apiKey != null && !apiKey.isBlank();
        status.put("configured", hasApiKey);
        status.put("baseUrl", baseUrl);

        if (!hasApiKey) {
            status.put("providerReachable", false);
            status.put("status", "missing_api_key");
            status.put("message", "Set FOOTBALL_API_KEY before calling EPL endpoints.");
            return status;
        }

        try {
            String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/status").toUriString();
            executeRequest(url);
            status.put("providerReachable", true);
            status.put("status", "ok");
            status.put("message", "EPL API key and provider connectivity are working.");
        } catch (RestClientException ex) {
            status.put("providerReachable", false);
            status.put("status", "provider_error");
            status.put("message", ex.getMessage());
        }

        return status;
    }

    private JsonNode executeRequest(String url) {
        HttpHeaders headers = new HttpHeaders();
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set("x-apisports-key", apiKey);
        }

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
        return response.getBody();
    }

    private int getCurrentSeason() {
        LocalDate now = LocalDate.now();
        return now.getMonthValue() >= 7 ? now.getYear() : now.getYear() - 1;
    }

    private static final Pattern ROUND_TRAILING_NUMBER = Pattern.compile("(\\d+)\\s*$");

    private String formatSeasonLabel(int openingYear) {
        return openingYear + "/" + (openingYear + 1);
    }

    private Integer parseRoundGameweek(String round) {
        if (round == null || round.isBlank()) {
            return null;
        }
        Matcher m = ROUND_TRAILING_NUMBER.matcher(round.trim());
        if (m.find()) {
            int n = Integer.parseInt(m.group(1));
            return n >= 1 && n <= 50 ? n : null;
        }
        return null;
    }

    private void putFixtureLondonDateAndKickoff(ObjectNode match, JsonNode fixture) {
        String dateStr = fixture.path("date").asText("");
        if (dateStr.isEmpty()) {
            match.put("date", "");
            match.putNull("kickoff");
            return;
        }
        try {
            Instant instant = Instant.parse(dateStr);
            ZonedDateTime uk = instant.atZone(ZoneId.of("Europe/London"));
            match.put("date", uk.toLocalDate().toString());
            match.put("kickoff", String.format("%02d:%02d", uk.getHour(), uk.getMinute()));
        } catch (DateTimeParseException ex) {
            match.put("date", dateStr.length() >= 10 ? dateStr.substring(0, 10) : dateStr);
            match.putNull("kickoff");
        }
    }

    private ObjectNode normalizeFixtureToAppMatch(JsonNode item, int seasonYear) {
        JsonNode fixture = item.path("fixture");
        JsonNode teams = item.path("teams");
        JsonNode goals = item.path("goals");
        String statusShort = fixture.path("status").path("short").asText("");

        String statusOut;
        if ("FT".equals(statusShort) || "AET".equals(statusShort) || "PEN".equals(statusShort)
                || "AWD".equals(statusShort) || "WO".equals(statusShort)) {
            statusOut = "finished";
        } else if ("NS".equals(statusShort) || "TBD".equals(statusShort) || "PST".equals(statusShort)
                || "CANC".equals(statusShort) || "ABD".equals(statusShort) || "SUSP".equals(statusShort)) {
            statusOut = "scheduled";
        } else {
            statusOut = "live";
        }

        ObjectNode match = objectMapper.createObjectNode();
        match.put("season", formatSeasonLabel(seasonYear));
        putFixtureLondonDateAndKickoff(match, fixture);

        String homeName = teams.path("home").path("name").asText("");
        String awayName = teams.path("away").path("name").asText("");
        if (homeName.isEmpty() || awayName.isEmpty()) {
            return null;
        }
        match.put("homeTeam", homeName);
        match.put("awayTeam", awayName);

        Integer gw = parseRoundGameweek(item.path("league").path("round").asText(""));
        if (gw != null) {
            match.put("gameweek", gw);
        } else {
            match.putNull("gameweek");
        }

        match.put("status", statusOut);

        boolean hasHome = !goals.path("home").isNull();
        boolean hasAway = !goals.path("away").isNull();
        if (hasHome && hasAway) {
            match.put("homeScore", goals.path("home").asInt());
            match.put("awayScore", goals.path("away").asInt());
        } else {
            match.putNull("homeScore");
            match.putNull("awayScore");
        }

        return match;
    }

    private ObjectNode createStandingRow(String teamName, List<Player> teamPlayers) {
        int playedGames = teamPlayers.stream()
                .map(Player::getMp)
                .filter(value -> value != null)
                .max(Integer::compareTo)
                .orElse(0);

        double goals = teamPlayers.stream()
                .map(Player::getGls)
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double assists = teamPlayers.stream()
                .map(Player::getAst)
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double xg = teamPlayers.stream()
                .map(Player::getXg)
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        int points = (int) Math.round((goals * 2.0) + assists);
        int goalDifference = (int) Math.round(goals - xg);

        int wins = Math.min(playedGames, Math.max(0, (int) Math.round(points / 3.0)));
        int remainingGames = Math.max(0, playedGames - wins);
        int draws = Math.min(remainingGames, (int) Math.round(assists / 10.0));
        int losses = Math.max(0, playedGames - wins - draws);

        ObjectNode row = objectMapper.createObjectNode();
        ObjectNode team = objectMapper.createObjectNode();
        team.put("id", Math.abs(teamName.hashCode()));
        team.put("name", teamName);
        row.set("team", team);
        row.put("playedGames", playedGames);
        row.put("won", wins);
        row.put("draw", draws);
        row.put("lost", losses);
        row.put("goalDifference", goalDifference);
        row.put("points", points);
        return row;
    }

    private JsonNode normalizeMatches(JsonNode raw) {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode matches = objectMapper.createArrayNode();

        JsonNode responseItems = raw.path("response");
        if (responseItems.isArray()) {
            for (JsonNode item : responseItems) {
                ObjectNode match = objectMapper.createObjectNode();
                JsonNode fixture = item.path("fixture");
                JsonNode teams = item.path("teams");
                JsonNode goals = item.path("goals");

                match.put("id", fixture.path("id").asInt());
                match.put("utcDate", fixture.path("date").asText(""));
                match.put("status", fixture.path("status").path("short").asText(""));

                ObjectNode homeTeam = objectMapper.createObjectNode();
                homeTeam.put("name", teams.path("home").path("name").asText(""));
                match.set("homeTeam", homeTeam);

                ObjectNode awayTeam = objectMapper.createObjectNode();
                awayTeam.put("name", teams.path("away").path("name").asText(""));
                match.set("awayTeam", awayTeam);

                ObjectNode score = objectMapper.createObjectNode();
                ObjectNode fullTime = objectMapper.createObjectNode();
                if (!goals.path("home").isNull()) {
                    fullTime.put("home", goals.path("home").asInt());
                } else {
                    fullTime.putNull("home");
                }
                if (!goals.path("away").isNull()) {
                    fullTime.put("away", goals.path("away").asInt());
                } else {
                    fullTime.putNull("away");
                }
                score.set("fullTime", fullTime);
                match.set("score", score);

                matches.add(match);
            }
        }

        result.set("matches", matches);
        return result;
    }
}
