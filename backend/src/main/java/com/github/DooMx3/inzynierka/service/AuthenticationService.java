package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.AuthenticationRequest;
import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.exceptions.ResourceAlreadyExistsException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
  private final UserRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final AuthenticationManager authenticationManager;

  public void register(RegisterRequest request, HttpServletResponse response) {
    if (repository.existsByEmail(request.email())) {
      throw new ResourceAlreadyExistsException(
          "User with email " + request.email() + " already exists");
    }
    User user =
        User.builder()
            .firstname(request.firstname())
            .lastname(request.lastname())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .membershipStatus(MembershipStatus.NONE)
            .active(true)
            .build();
    repository.save(user);

    addAuthCookies(response, user);
  }

  public void authenticate(AuthenticationRequest request, HttpServletResponse response) {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email(), request.password()));
    var user = repository.findByEmail(request.email()).orElseThrow();

    addAuthCookies(response, user);
  }

  public void refresh(String refreshToken, HttpServletResponse response) {
    if (refreshToken == null || refreshToken.isBlank()) {
      rejectRefresh(response);
    }

    String email;
    try {
      email = jwtService.extractUsername(refreshToken);
    } catch (JwtException | IllegalArgumentException exception) {
      rejectRefresh(response);
      return;
    }

    if (email == null || email.isBlank()) {
      rejectRefresh(response);
    }

    User user = repository.findByEmail(email).orElse(null);
    if (user == null || !user.isEnabled()) {
      rejectRefresh(response);
    }

    try {
      if (!jwtService.isRefreshTokenValid(refreshToken, user)) {
        rejectRefresh(response);
      }
    } catch (JwtException | IllegalArgumentException exception) {
      rejectRefresh(response);
      return;
    }

    addCookie(
        response,
        JwtService.ACCESS_TOKEN_COOKIE,
        jwtService.generateAccessToken(user),
        JwtService.ACCESS_TOKEN_MAX_AGE_SECONDS);
  }

  private void addAuthCookies(HttpServletResponse response, User user) {
    addCookie(
        response,
        JwtService.ACCESS_TOKEN_COOKIE,
        jwtService.generateAccessToken(user),
        JwtService.ACCESS_TOKEN_MAX_AGE_SECONDS);
    addCookie(
        response,
        JwtService.REFRESH_TOKEN_COOKIE,
        jwtService.generateRefreshToken(user),
        JwtService.REFRESH_TOKEN_MAX_AGE_SECONDS);
  }

  private void addCookie(
      HttpServletResponse response, String name, String token, int maxAgeSeconds) {
    Cookie cookie = new Cookie(name, token);
    cookie.setHttpOnly(true);
    cookie.setSecure(false);
    cookie.setPath("/");
    cookie.setMaxAge(maxAgeSeconds);
    response.addCookie(cookie);
  }

  private void rejectRefresh(HttpServletResponse response) {
    expireAuthCookies(response);
    throw new UnauthorizedException("Refresh token is invalid or expired");
  }

  private void expireAuthCookies(HttpServletResponse response) {
    expireCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    expireCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
  }

  private void expireCookie(HttpServletResponse response, String name) {
    Cookie cookie = new Cookie(name, null);
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }
}
