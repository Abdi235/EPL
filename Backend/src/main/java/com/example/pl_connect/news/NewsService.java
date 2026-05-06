package com.example.pl_connect.news;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class NewsService {

    private static final Logger log = LoggerFactory.getLogger(NewsService.class);

    private static final DateTimeFormatter RFC_1123 = DateTimeFormatter.RFC_1123_DATE_TIME.withLocale(Locale.ENGLISH);

    private final RestTemplate restTemplate;
    private final List<String> rssUrls;
    private final Pattern titleFilter;
    private final Pattern excludeFilter;
    private final int maxArticles;
    private final String attribution;

    private volatile List<NewsArticle> cache;
    private volatile Instant cacheExpires = Instant.EPOCH;
    private volatile String cacheFetchedAt;

    public NewsService(
            RestTemplate restTemplate,
            @Value("${app.news.rss-urls}") String rssUrlsCsv,
            @Value("${app.news.title-filter-regex:}") String titleFilterRegex,
            @Value("${app.news.exclude-regex:}") String excludeRegex,
            @Value("${app.news.max-articles:24}") int maxArticles,
            @Value("${app.news.attribution:Premier League headlines from BBC Sport and The Guardian.}") String attribution
    ) {
        this.restTemplate = restTemplate;
        this.rssUrls = parseUrlList(rssUrlsCsv);
        this.titleFilter = titleFilterRegex == null || titleFilterRegex.isBlank()
                ? null
                : Pattern.compile(titleFilterRegex, Pattern.CASE_INSENSITIVE);
        this.excludeFilter = excludeRegex == null || excludeRegex.isBlank()
                ? null
                : Pattern.compile(excludeRegex, Pattern.CASE_INSENSITIVE);
        this.maxArticles = Math.max(4, Math.min(maxArticles, 60));
        this.attribution = attribution;
    }

    private static List<String> parseUrlList(String csv) {
        List<String> out = new ArrayList<>();
        if (csv == null) {
            return out;
        }
        for (String part : csv.split(",")) {
            String u = part.trim();
            if (!u.isEmpty()) {
                out.add(u);
            }
        }
        return out;
    }

    public NewsResponse getNews(boolean bypassCache) {
        Instant now = Instant.now();
        if (!bypassCache && cache != null && now.isBefore(cacheExpires)) {
            return new NewsResponse(cache, cacheFetchedAt, attribution);
        }
        synchronized (this) {
            if (!bypassCache && cache != null && Instant.now().isBefore(cacheExpires)) {
                return new NewsResponse(cache, cacheFetchedAt, attribution);
            }
            List<NewsArticle> merged = fetchFresh();
            cache = List.copyOf(merged);
            cacheFetchedAt = Instant.now().toString();
            cacheExpires = Instant.now().plusSeconds(300);
            return new NewsResponse(cache, cacheFetchedAt, attribution);
        }
    }

    private List<NewsArticle> fetchFresh() {
        List<NewsArticle> all = new ArrayList<>();
        for (String url : rssUrls) {
            try {
                all.addAll(parseFeed(url));
            } catch (Exception e) {
                log.warn("RSS fetch or parse failed for {}: {}", url, e.getMessage());
            }
        }
        all.sort(Comparator.comparing(NewsArticle::publishedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        List<NewsArticle> deduped = dedupeByLink(all);
        if (titleFilter != null) {
            deduped = deduped.stream()
                    .filter(a -> matchesFilter(a, titleFilter))
                    .toList();
        }
        if (excludeFilter != null) {
            deduped = deduped.stream()
                    .filter(a -> !matchesFilter(a, excludeFilter))
                    .toList();
        }
        if (deduped.size() > maxArticles) {
            deduped = deduped.subList(0, maxArticles);
        }
        return deduped;
    }

    private static boolean matchesFilter(NewsArticle a, Pattern pattern) {
        if (a.title() != null && pattern.matcher(a.title()).find()) {
            return true;
        }
        return a.summary() != null && pattern.matcher(a.summary()).find();
    }

    private List<NewsArticle> dedupeByLink(List<NewsArticle> items) {
        List<NewsArticle> out = new ArrayList<>();
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (NewsArticle a : items) {
            String key = (a.link() != null && !a.link().isBlank()) ? a.link() : "|" + a.title();
            if (seen.add(key)) {
                out.add(a);
            }
        }
        return out;
    }

    private List<NewsArticle> parseFeed(String feedUrl) throws Exception {
        byte[] body = download(feedUrl);
        Document doc = parseXml(body);
        NodeList items = doc.getElementsByTagName("item");
        String source = sourceLabel(feedUrl);
        List<NewsArticle> list = new ArrayList<>();
        for (int i = 0; i < items.getLength(); i++) {
            Element el = (Element) items.item(i);
            String title = textOf(el, "title");
            String link = linkOf(el);
            String description = textOf(el, "description");
            String pub = textOf(el, "pubDate");
            if (title == null || title.isBlank()) {
                continue;
            }
            String publishedIso = parsePubDate(pub);
            String summary = truncate(stripTags(description), 280);
            list.add(new NewsArticle(title.trim(), link, summary, publishedIso, source));
        }
        return list;
    }

    private byte[] download(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "PremierZone/1.0 (+https://github.com/Abdi235/EPL)");
        headers.set(HttpHeaders.ACCEPT, "application/rss+xml, application/xml, text/xml, */*");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
        byte[] body = response.getBody();
        if (body == null || body.length == 0) {
            throw new RestClientException("Empty RSS body");
        }
        return body;
    }

    private Document parseXml(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(false);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        try {
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        } catch (IllegalArgumentException ignored) {
            // older parsers
        }
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(xml));
    }

    private static String textOf(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes.getLength() == 0) {
            return null;
        }
        return nodes.item(0).getTextContent();
    }

    private static String linkOf(Element item) {
        NodeList links = item.getElementsByTagName("link");
        if (links.getLength() > 0) {
            return links.item(0).getTextContent() != null
                    ? links.item(0).getTextContent().trim()
                    : null;
        }
        return null;
    }

    private static String parsePubDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim();
        try {
            ZonedDateTime zdt = ZonedDateTime.parse(s, RFC_1123);
            return zdt.withZoneSameInstant(ZoneOffset.UTC).toInstant().toString();
        } catch (DateTimeParseException e) {
            try {
                return Instant.parse(s).toString();
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }

    private static String stripTags(String html) {
        if (html == null) {
            return "";
        }
        String noTags = html.replaceAll("<[^>]+>", " ");
        return noTags.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", "\"").trim();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.replaceAll("\\s+", " ").trim();
        if (t.length() <= max) {
            return t;
        }
        return t.substring(0, max - 1).trim() + "…";
    }

    private static String sourceLabel(String feedUrl) {
        String u = feedUrl.toLowerCase(Locale.ROOT);
        if (u.contains("bbc.co.uk")) {
            return "BBC Sport";
        }
        if (u.contains("theguardian.com")) {
            return "The Guardian";
        }
        if (u.contains("skysports.com")) {
            return "Sky Sports";
        }
        try {
            java.net.URI uri = java.net.URI.create(feedUrl);
            String host = uri.getHost();
            return host != null ? host : "News";
        } catch (Exception e) {
            return "News";
        }
    }
}
