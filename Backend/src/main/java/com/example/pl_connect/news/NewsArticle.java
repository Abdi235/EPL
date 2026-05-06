package com.example.pl_connect.news;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record NewsArticle(
        String title,
        String link,
        String summary,
        String publishedAt,
        String source
) {
}
