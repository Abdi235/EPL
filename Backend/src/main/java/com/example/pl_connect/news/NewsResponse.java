package com.example.pl_connect.news;

import java.util.List;

public record NewsResponse(
        List<NewsArticle> articles,
        String fetchedAt,
        String attribution
) {
}
