package com.amiti.finance.security;

import com.amiti.finance.entity.AppUser;
import com.amiti.finance.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
    }

    public String generateAccessToken(AppUser user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.getAccessTokenMinutes(), ChronoUnit.MINUTES);
        return Jwts.builder()
                .issuer(properties.getIssuer())
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey())
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID userId(String token) {
        return UUID.fromString(parse(token).get("userId", String.class));
    }

    public String email(String token) {
        return parse(token).getSubject();
    }

    public Instant refreshExpiry() {
        return Instant.now().plus(properties.getRefreshTokenDays(), ChronoUnit.DAYS);
    }

    public Instant passwordResetExpiry() {
        return Instant.now().plus(properties.getPasswordResetMinutes(), ChronoUnit.MINUTES);
    }

    public String randomToken() {
        return UUID.randomUUID() + "-" + UUID.randomUUID();
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
