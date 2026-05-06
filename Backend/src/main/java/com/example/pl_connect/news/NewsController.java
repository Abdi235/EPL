package com.example.pl_connect.news;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    /**
     * Aggregated RSS headlines (BBC Sport + Guardian football by default).
     * Cached ~5 minutes server-side. Pass refresh=true to bypass cache.
     */
    @GetMapping("/news")
    public ResponseEntity<NewsResponse> getNews(
            @RequestParam(name = "refresh", defaultValue = "false") boolean refresh
    ) {
        return ResponseEntity.ok(newsService.getNews(refresh));
    }
}
