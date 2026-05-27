package com.example.pl_connect.epl;

import com.example.pl_connect.matchdata.NormalizedMatchesService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(path = "api/v1/epl")
public class EplController {

    private final EplService eplService;
    private final NormalizedMatchesService normalizedMatchesService;
    private final ObjectMapper objectMapper;

    public EplController(
            EplService eplService,
            NormalizedMatchesService normalizedMatchesService,
            ObjectMapper objectMapper) {
        this.eplService = eplService;
        this.normalizedMatchesService = normalizedMatchesService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/standings")
    public ResponseEntity<?> getStandings() {
        try {
            JsonNode response = eplService.getStandings();
            return ResponseEntity.ok(response);
        } catch (RestClientException ex) {
            return buildApiError(ex);
        }
    }

    @GetMapping("/live")
    public ResponseEntity<?> getLiveMatches() {
        try {
            JsonNode response = eplService.getLiveMatches();
            return ResponseEntity.ok(response);
        } catch (RestClientException ex) {
            return buildApiError(ex);
        }
    }

    @GetMapping("/results")
    public ResponseEntity<?> getRecentResults() {
        try {
            JsonNode response = eplService.getRecentResults();
            return ResponseEntity.ok(response);
        } catch (RestClientException ex) {
            return buildApiError(ex);
        }
    }

    @GetMapping("/season-matches")
    public ResponseEntity<?> getSeasonMatches(@RequestParam(name = "season", required = false) Integer season) {
        try {
            JsonNode response = eplService.getSeasonMatches(season);
            return ResponseEntity.ok(response);
        } catch (RestClientException ex) {
            return buildApiError(ex);
        }
    }

    @GetMapping("/league-table")
    public ResponseEntity<?> getLeagueTable(@RequestParam(name = "season", required = false) Integer season) {
        try {
            JsonNode response = eplService.getLeagueTable(season);
            return ResponseEntity.ok(response);
        } catch (RestClientException ex) {
            return buildApiError(ex);
        }
    }

    /**
     * Full normalized match list (classpath CSVs + live current season from API-Football when configured).
     * Intended for the SPA Results / Gameweeks / Home highlights — always fresh when the client re-fetches.
     */
    @GetMapping("/normalized-matches")
    public ResponseEntity<?> getNormalizedMatches() {
        try {
            ArrayNode matches = normalizedMatchesService.buildNormalizedMatches();
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(matches);
        } catch (IOException ex) {
            return buildMatchDataError(ex);
        }
    }

    /**
     * Matches + official league table for the current season (one refresh for Home / Results / Table).
     */
    @GetMapping("/matchday-data")
    public ResponseEntity<?> getMatchdayData() {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.set("matches", normalizedMatchesService.buildNormalizedMatches());
            body.put("updatedAt", Instant.now().toString());
            try {
                body.set("leagueTable", eplService.getLeagueTable(null));
            } catch (RestClientException ex) {
                body.putNull("leagueTable");
            }
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore().mustRevalidate())
                    .body(body);
        } catch (IOException ex) {
            return buildMatchDataError(ex);
        }
    }

    @GetMapping("/health")
    public Map<String, Object> getHealth() {
        return eplService.getHealthStatus();
    }

    private ResponseEntity<Map<String, Object>> buildMatchDataError(IOException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "match_data_error");
        error.put("message", "Could not build matchday data from classpath CSVs.");
        error.put("details", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private ResponseEntity<Map<String, Object>> buildApiError(Exception ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "upstream_error");
        error.put("message", "Football API request failed. Check FOOTBALL_API_KEY and API limits.");
        error.put("details", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }
}
