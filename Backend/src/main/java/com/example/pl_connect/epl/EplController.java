package com.example.pl_connect.epl;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(path = "api/v1/epl")
public class EplController {

    private final EplService eplService;

    public EplController(EplService eplService) {
        this.eplService = eplService;
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

    @GetMapping("/health")
    public Map<String, Object> getHealth() {
        return eplService.getHealthStatus();
    }

    private ResponseEntity<Map<String, Object>> buildApiError(Exception ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "upstream_error");
        error.put("message", "Football API request failed. Check FOOTBALL_API_KEY and API limits.");
        error.put("details", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }
}
