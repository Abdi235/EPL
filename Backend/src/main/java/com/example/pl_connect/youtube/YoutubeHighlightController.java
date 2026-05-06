package com.example.pl_connect.youtube;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/youtube")
public class YoutubeHighlightController {

    private final YoutubeHighlightService youtubeHighlightService;

    public YoutubeHighlightController(YoutubeHighlightService youtubeHighlightService) {
        this.youtubeHighlightService = youtubeHighlightService;
    }

    /**
     * Resolves a direct YouTube watch URL via Data API v3 search (requires {@code app.youtube.api-key} / {@code YOUTUBE_API_KEY}).
     */
    @GetMapping("/highlight")
    public ResponseEntity<YoutubeHighlightResponse> highlight(
            @RequestParam String home,
            @RequestParam String away,
            @RequestParam String date,
            @RequestParam(name = "homeScore", required = false) Integer homeScore,
            @RequestParam(name = "awayScore", required = false) Integer awayScore
    ) {
        YoutubeHighlightResponse body = youtubeHighlightService.resolve(home, away, date, homeScore, awayScore);
        return ResponseEntity.ok(body);
    }
}
