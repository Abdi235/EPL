package com.example.pl_connect.matchdata;

import com.example.pl_connect.epl.EplService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;

/**
 * Persists merged matchday payload on disk and refreshes from football-data.co.uk + API-Football.
 * Cache stays short-lived so finished (FT) scores and the league table update promptly.
 */
@Service
public class EplMatchdayCacheService {

    private static final String CACHE_FILENAME = "matchday-cache.json";

    private final NormalizedMatchesService normalizedMatchesService;
    private final EplService eplService;
    private final FootballDataUkSyncService footballDataUkSyncService;
    private final ObjectMapper objectMapper;

    @Value("${app.epl.data-dir:data/epl-sync}")
    private String dataDir;

    @Value("${app.epl.cache-stale-minutes:2}")
    private int cacheStaleMinutes;

    @Value("${app.epl.cache-live-stale-minutes:1}")
    private int cacheLiveStaleMinutes;

    public EplMatchdayCacheService(
            NormalizedMatchesService normalizedMatchesService,
            EplService eplService,
            FootballDataUkSyncService footballDataUkSyncService,
            ObjectMapper objectMapper) {
        this.normalizedMatchesService = normalizedMatchesService;
        this.eplService = eplService;
        this.footballDataUkSyncService = footballDataUkSyncService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void warmCacheOnStartup() {
        try {
            refreshIfStale(true);
        } catch (IOException ex) {
            // Logged implicitly; endpoints can still build on demand.
        }
    }

    @Scheduled(fixedDelayString = "${app.epl.cache-refresh-ms:120000}")
    public void scheduledRefresh() {
        try {
            refreshIfStale(false);
        } catch (IOException ignored) {
        }
    }

    public ObjectNode getMatchdayData(boolean forceRefresh) throws IOException {
        if (forceRefresh || isCacheStale()) {
            refresh();
        }
        ObjectNode cached = readCacheFile();
        if (cached != null) {
            return cached;
        }
        return buildAndPersist();
    }

    public ObjectNode refresh() throws IOException {
        footballDataUkSyncService.downloadCurrentSeasonE0();
        return buildAndPersist();
    }

    private void refreshIfStale(boolean allowMissing) throws IOException {
        if (!allowMissing && !isCacheStale()) {
            return;
        }
        if (isCacheStale()) {
            refresh();
        }
    }

    private boolean isCacheStale() {
        try {
            Path cache = cachePath();
            if (!Files.exists(cache)) {
                return true;
            }
            Instant modified = Files.getLastModifiedTime(cache).toInstant();
            long ageMinutes = Duration.between(modified, Instant.now()).toMinutes();
            int threshold = Math.max(1, cacheStaleMinutes);
            if (cacheContainsLiveMatches(cache) && cacheLiveStaleMinutes > 0) {
                threshold = Math.min(threshold, Math.max(1, cacheLiveStaleMinutes));
            }
            return ageMinutes >= threshold;
        } catch (IOException ex) {
            return true;
        }
    }

    private boolean cacheContainsLiveMatches(Path cache) {
        try {
            JsonNode root = objectMapper.readTree(cache.toFile());
            JsonNode matches = root.path("matches");
            if (!matches.isArray()) {
                return false;
            }
            for (JsonNode m : matches) {
                if ("live".equalsIgnoreCase(m.path("status").asText(""))) {
                    return true;
                }
            }
            return false;
        } catch (IOException ex) {
            return false;
        }
    }

    private ObjectNode buildAndPersist() throws IOException {
        ArrayNode matches = normalizedMatchesService.buildNormalizedMatches();
        String seasonLabel = NormalizedMatchesService.currentSeasonLabel();

        ObjectNode leagueTable = objectMapper.createObjectNode();
        leagueTable.put("seasonLabel", seasonLabel);
        leagueTable.put("seasonYear", NormalizedMatchesService.currentSeasonOpeningYear());
        String tableSource = "computed-from-matches";

        try {
            JsonNode apiTable = eplService.getLeagueTable(null);
            if (apiTable.path("table").isArray() && apiTable.path("table").size() > 0) {
                leagueTable = (ObjectNode) apiTable;
                tableSource = apiTable.path("source").asText("api-football");
            } else {
                ArrayNode computed = normalizedMatchesService.buildLeagueTableFromMatches(seasonLabel);
                leagueTable.set("table", computed);
                leagueTable.put("source", tableSource);
            }
        } catch (RestClientException ignored) {
            ArrayNode computed = normalizedMatchesService.buildLeagueTableFromMatches(seasonLabel);
            leagueTable.set("table", computed);
            leagueTable.put("source", tableSource);
        }

        ObjectNode root = objectMapper.createObjectNode();
        root.set("matches", matches);
        root.set("leagueTable", leagueTable);
        root.put("updatedAt", Instant.now().toString());
        root.put("matchesSource", "merged-csv-and-api");
        root.put("tableSource", tableSource);
        root.put("footballDataSyncedAt", footballDataUkSyncService.lastSyncedAt() != null
                ? footballDataUkSyncService.lastSyncedAt().toString()
                : null);

        Files.createDirectories(Path.of(dataDir));
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(cachePath().toFile(), root);
        return root;
    }

    private ObjectNode readCacheFile() {
        try {
            Path cache = cachePath();
            if (!Files.exists(cache)) {
                return null;
            }
            return (ObjectNode) objectMapper.readTree(cache.toFile());
        } catch (IOException ex) {
            return null;
        }
    }

    private Path cachePath() {
        return Path.of(dataDir).resolve(CACHE_FILENAME);
    }
}
