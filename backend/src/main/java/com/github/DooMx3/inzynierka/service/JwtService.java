package com.github.DooMx3.inzynierka.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  public static final String ACCESS_TOKEN_COOKIE = "access_token";
  public static final String REFRESH_TOKEN_COOKIE = "refresh_token";
  public static final int ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
  public static final int REFRESH_TOKEN_MAX_AGE_SECONDS = 28 * 24 * 60 * 60;

  private static final String TOKEN_TYPE_CLAIM = "tokenType";
  private static final String ACCESS_TOKEN_TYPE = "access";
  private static final String REFRESH_TOKEN_TYPE = "refresh";
  private static final long ACCESS_TOKEN_EXPIRATION_TIME = ACCESS_TOKEN_MAX_AGE_SECONDS * 1000L;
  private static final long REFRESH_TOKEN_EXPIRATION_TIME = REFRESH_TOKEN_MAX_AGE_SECONDS * 1000L;

  public JwtService(@Value("${app.jwt.secret}") String secretKey) {
    SECRET_KEY = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
  }

  private final Key SECRET_KEY;

  public String extractUsername(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
    final Claims claims = extractAllClaims(token);
    return claimsResolver.apply(claims);
  }

  public String generateAccessToken(UserDetails userDetails) {
    return generateToken(userDetails, ACCESS_TOKEN_TYPE, ACCESS_TOKEN_EXPIRATION_TIME);
  }

  public String generateRefreshToken(UserDetails userDetails) {
    return generateToken(userDetails, REFRESH_TOKEN_TYPE, REFRESH_TOKEN_EXPIRATION_TIME);
  }

  private String generateToken(UserDetails userDetails, String tokenType, long expirationTime) {
    return Jwts.builder()
        .setSubject(userDetails.getUsername())
        .claim(TOKEN_TYPE_CLAIM, tokenType)
        .setIssuedAt(new Date(System.currentTimeMillis()))
        .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
        .signWith(SECRET_KEY, SignatureAlgorithm.HS256)
        .compact();
  }

  public boolean isAccessTokenValid(String token, UserDetails userDetails) {
    return isTokenValid(token, userDetails, ACCESS_TOKEN_TYPE);
  }

  public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
    return isTokenValid(token, userDetails, REFRESH_TOKEN_TYPE);
  }

  private boolean isTokenValid(String token, UserDetails userDetails, String expectedType) {
    Claims claims = extractAllClaims(token);
    String username = claims.getSubject();
    Date expiration = claims.getExpiration();
    return username != null
        && expiration != null
        && userDetails.getUsername().equals(username)
        && expectedType.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
        && expiration.after(new Date());
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder().setSigningKey(SECRET_KEY).build().parseClaimsJws(token).getBody();
  }
}
