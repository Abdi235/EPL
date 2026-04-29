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

import java.time.LocalDate;
import java.util.Comparator;
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
