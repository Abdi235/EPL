package com.example.pl_connect.matchdata;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/match-data")
public class MatchDataController {

    @GetMapping(value = "/pl_matches_2024_25.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> plMatches202425() throws IOException {
        return readClasspath("match-data/pl_matches_2024_25.csv");
    }

    @GetMapping(value = "/premier_league_stats_2024_25.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> premierLeagueTable202425() throws IOException {
        return readClasspath("match-data/premier_league_stats_2024_25.csv");
    }

    @GetMapping(value = "/football_data_E0_2526.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> footballDataE02526() throws IOException {
        return readClasspath("match-data/football_data_E0_2526.csv");
    }

    private ResponseEntity<byte[]> readClasspath(String location) throws IOException {
        ClassPathResource resource = new ClassPathResource(location);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        try (InputStream in = resource.getInputStream()) {
            byte[] body = StreamUtils.copyToByteArray(in);
            return ResponseEntity.ok()
                    .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .body(body);
        }
    }
}
