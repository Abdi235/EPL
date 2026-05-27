package com.example.pl_connect.matchdata;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;

/**
 * Pulls the current Premier League CSV from football-data.co.uk (no API key required).
 */
@Service
public class FootballDataUkSyncService {

    private static final String E0_URL_2526 = "https://www.football-data.co.uk/mmz4281/2526/E0.csv";
    private static final String E0_FILENAME = "football_data_E0_2526.csv";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.epl.data-dir:data/epl-sync}")
    private String dataDir;

    public Path syncDirectory() {
        return Path.of(dataDir);
    }

    public Path syncedE0Path() {
        return syncDirectory().resolve(E0_FILENAME);
    }

    /**
     * @return path to downloaded file, or null on failure
     */
    public Path downloadCurrentSeasonE0() {
        try {
            Files.createDirectories(syncDirectory());
            Path target = syncedE0Path();
            Path temp = syncDirectory().resolve(E0_FILENAME + ".tmp");
            byte[] body = restTemplate.getForObject(E0_URL_2526, byte[].class);
            if (body == null || body.length < 100) {
                return null;
            }
            Files.write(temp, body);
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            return target;
        } catch (IOException | org.springframework.web.client.RestClientException ex) {
            return null;
        }
    }

    public Instant lastSyncedAt() {
        try {
            Path p = syncedE0Path();
            if (!Files.exists(p)) {
                return null;
            }
            return Files.getLastModifiedTime(p).toInstant();
        } catch (IOException ex) {
            return null;
        }
    }
}
