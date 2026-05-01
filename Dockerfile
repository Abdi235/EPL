# Build Spring Boot API from monorepo root (Render Docker builds default to repo root).
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY Backend/pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY Backend/src ./src
RUN mvn -q -DskipTests clean package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/*SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
