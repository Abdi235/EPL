package com.example.pl_connect.youtube;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record YoutubeHighlightResponse(String url, String videoId) {
    public static YoutubeHighlightResponse empty() {
        return new YoutubeHighlightResponse(null, null);
    }
}
