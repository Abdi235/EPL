package com.example.pl_connect.env;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Render Postgres exposes {@code DATABASE_URL} / {@code DB_URL} as
 * {@code postgresql://user:password@host:port/db}. Spring JDBC expects
 * {@code jdbc:postgresql://...} plus credentials as separate properties.
 */
public class RenderDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String SOURCE = "renderPostgresJdbc";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (environment.getPropertySources().contains(SOURCE)) {
            return;
        }

        String raw = firstNonBlank(environment.getProperty("DATABASE_URL"), environment.getProperty("DB_URL"));
        if (raw == null) {
            return;
        }
        raw = raw.trim();
        if (raw.startsWith("postgres://")) {
            raw = "postgresql://" + raw.substring("postgres://".length());
        }

        if (raw.startsWith("jdbc:postgresql:")) {
            return;
        }

        if (!raw.startsWith("postgresql://")) {
            return;
        }

        Parsed parsed = parsePostgresUri(raw);
        String sslMode = firstNonBlank(environment.getProperty("PGSSLMODE"), "require");
        String jdbcUrl = "jdbc:postgresql://" + parsed.host + ":" + parsed.port + "/" + parsed.database
                + "?sslmode=" + sslMode;

        Map<String, Object> map = new HashMap<>();
        map.put("spring.datasource.url", jdbcUrl);
        map.put("spring.datasource.username", parsed.username);
        map.put("spring.datasource.password", parsed.password);
        environment.getPropertySources().addFirst(new MapPropertySource(SOURCE, map));
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }

    private static Parsed parsePostgresUri(String raw) {
        // URI class does not register the postgresql scheme; reuse http parsing for components.
        String forUri = "http://" + raw.substring("postgresql://".length());
        URI uri = URI.create(forUri);

        String userInfo = uri.getRawUserInfo();
        String username = "";
        String password = "";
        if (userInfo != null && !userInfo.isEmpty()) {
            int idx = userInfo.indexOf(':');
            if (idx >= 0) {
                username = urlDecode(userInfo.substring(0, idx));
                password = urlDecode(userInfo.substring(idx + 1));
            } else {
                username = urlDecode(userInfo);
            }
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Invalid Postgres URL (missing host)");
        }

        int port = uri.getPort();
        if (port == -1) {
            port = 5432;
        }

        String path = uri.getPath();
        if (path == null || path.length() <= 1) {
            throw new IllegalArgumentException("Invalid Postgres URL (missing database name)");
        }
        String database = path.substring(1);

        return new Parsed(username, password, host, port, database);
    }

    private static String urlDecode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    private record Parsed(String username, String password, String host, int port, String database) {
    }
}
