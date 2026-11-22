package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.jsonwebtoken.Claims;
import java.time.Duration;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

class JwtServiceTest {

  private final JwtService jwtService =
      new JwtService("this-is-a-test-secret-key-at-least-32-chars");

  private final UserDetails user =
      User.withUsername("user@example.com").password("password").authorities("USER").build();

  @Test
  void shouldGenerateDistinctAccessAndRefreshTokensWithExpectedLifetimes() {
    String accessToken = jwtService.generateAccessToken(user);
    String refreshToken = jwtService.generateRefreshToken(user);
    Date accessIssuedAt = jwtService.extractClaim(accessToken, Claims::getIssuedAt);
    Date accessExpiresAt = jwtService.extractClaim(accessToken, Claims::getExpiration);
    Date refreshIssuedAt = jwtService.extractClaim(refreshToken, Claims::getIssuedAt);
    Date refreshExpiresAt = jwtService.extractClaim(refreshToken, Claims::getExpiration);

    assertEquals(
        15 * 60,
        Duration.between(accessIssuedAt.toInstant(), accessExpiresAt.toInstant()).toSeconds());
    assertEquals(
        28 * 24 * 60 * 60,
        Duration.between(refreshIssuedAt.toInstant(), refreshExpiresAt.toInstant()).toSeconds());
    assertTrue(jwtService.isAccessTokenValid(accessToken, user));
    assertTrue(jwtService.isRefreshTokenValid(refreshToken, user));
  }

  @Test
  void shouldNotAcceptAccessTokenAsRefreshTokenOrViceVersa() {
    String accessToken = jwtService.generateAccessToken(user);
    String refreshToken = jwtService.generateRefreshToken(user);

    assertFalse(jwtService.isRefreshTokenValid(accessToken, user));
    assertFalse(jwtService.isAccessTokenValid(refreshToken, user));
  }
}
