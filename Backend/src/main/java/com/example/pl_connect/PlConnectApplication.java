package com.example.pl_connect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PlConnectApplication {

    public static void main(String[] args) {
        ensureProdProfileWhenDatabaseUrlPresent();
        SpringApplication.run(PlConnectApplication.class, args);
    }

    /**
     * Render (and other hosts) inject DATABASE_URL / DB_URL while developers often omit
     * SPRING_PROFILES_ACTIVE; without prod, application-dev.properties points at localhost.
     */
    private static void ensureProdProfileWhenDatabaseUrlPresent() {
        String explicit = System.getenv("SPRING_PROFILES_ACTIVE");
        if (explicit != null && !explicit.isBlank()) {
            return;
        }
        String dbUrl = firstNonBlank(System.getenv("DATABASE_URL"), System.getenv("DB_URL"));
        if (dbUrl != null && !dbUrl.isBlank()) {
            System.setProperty("spring.profiles.active", "prod");
        }
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
}
