package com.example.pl_connect.youtube;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class YoutubeHighlightService {

    private static final Logger log = LoggerFactory.getLogger(YoutubeHighlightService.class);

    /** Fubo Sports — https://www.youtube.com/c/fubosports */
    private static final String FUBO_SPORTS_CHANNEL_ID = "UCiPywDqO1dB34oxfEjjbQnw";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String channelId;
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public YoutubeHighlightService(
            ObjectMapper objectMapper,
            @Value("${app.youtube.api-key:}") String apiKey,
            @Value("${app.youtube.channel-id:}") String channelIdRaw
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        String ch = channelIdRaw == null ? "" : channelIdRaw.trim();
        this.channelId = ch.isEmpty() ? FUBO_SPORTS_CHANNEL_ID : ch;
    }

    public YoutubeHighlightResponse resolve(
            String home,
            String away,
            String date,
            Integer homeScore,
            Integer awayScore
    ) {
        if (apiKey.isEmpty()) {
            return YoutubeHighlightResponse.empty();
        }

        String cacheKey = cacheKey(home, away, date, homeScore, awayScore, channelId);
        CacheEntry hit = cache.get(cacheKey);
        if (hit != null && hit.expiresAt.isAfter(Instant.now())) {
            return new YoutubeHighlightResponse(hit.url, hit.videoId);
        }

        String q = buildQuery(home, away, date, homeScore, awayScore);
        if (q.isEmpty()) {
            return YoutubeHighlightResponse.empty();
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl("https://www.googleapis.com/youtube/v3/search")
                    .queryParam("part", "snippet")
                    .queryParam("type", "video")
                    .queryParam("maxResults", "8")
                    .queryParam("channelId", channelId)
                    .queryParam("q", q)
                    .queryParam("key", apiKey)
                    .build()
                    .encode()
                    .toUri();

            String body = restTemplate.getForObject(uri, String.class);
            if (body == null || body.isBlank()) {
                return YoutubeHighlightResponse.empty();
            }

            JsonNode root = objectMapper.readTree(body);
            if (root.hasNonNull("error")) {
                log.warn("YouTube API error: {}", root.path("error").path("message").asText());
                return YoutubeHighlightResponse.empty();
            }

            JsonNode items = root.path("items");
            if (!items.isArray() || items.isEmpty()) {
                return YoutubeHighlightResponse.empty();
            }

            String bestId = pickVideoId(items);
            if (bestId == null || bestId.isBlank()) {
                return YoutubeHighlightResponse.empty();
            }

            String url = "https://www.youtube.com/watch?v=" + bestId;
            cache.put(cacheKey, new CacheEntry(url, bestId, Instant.now().plusSeconds(1800)));
            return new YoutubeHighlightResponse(url, bestId);
        } catch (RestClientException e) {
            log.warn("YouTube request failed: {}", e.getMessage());
            return YoutubeHighlightResponse.empty();
        } catch (Exception e) {
            log.warn("YouTube parse failed: {}", e.getMessage());
            return YoutubeHighlightResponse.empty();
        }
    }

    private static String pickVideoId(JsonNode items) {
        String fallback = null;
        for (JsonNode item : items) {
            String videoId = item.path("id").path("videoId").asText(null);
            if (videoId == null || videoId.isBlank()) {
                continue;
            }
            if (fallback == null) {
                fallback = videoId;
            }
            String title = item.path("snippet").path("title").asText("").toLowerCase(Locale.ROOT);
            if (title.contains("highlight")) {
                return videoId;
            }
        }
        return fallback;
    }

    private static String buildQuery(String home, String away, String date, Integer homeScore, Integer awayScore) {
        String h = home == null ? "" : home.trim();
        String a = away == null ? "" : away.trim();
        if (h.isEmpty() || a.isEmpty()) {
            return "";
        }
        String year = "";
        if (date != null && date.length() >= 4) {
            year = date.substring(0, 4);
        }
        StringBuilder sb = new StringBuilder();
        sb.append(h).append(" vs ").append(a);
        if (homeScore != null && awayScore != null) {
            sb.append(" ").append(homeScore).append("-").append(awayScore);
        }
        if (!year.isEmpty()) {
            sb.append(" ").append(year);
        }
        sb.append(" Premier League highlights");
        return sb.toString();
    }

    private static String cacheKey(String home, String away, String date, Integer hs, Integer as, String channel) {
        return String.join("|",
                String.valueOf(home),
                String.valueOf(away),
                String.valueOf(date),
                String.valueOf(hs),
                String.valueOf(as),
                String.valueOf(channel));
    }

    private record CacheEntry(String url, String videoId, Instant expiresAt) {
    }
}
