package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.user.AuthenticationRequest;
import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.service.AuthenticationService;
import com.github.DooMx3.inzynierka.service.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(
    name = "Authentication",
    description = "Authentication endpoints for user registration, login, and logout.")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

  private final AuthenticationService service;

  @Value("${app.cookie.secure:true}")
  private boolean secureCookies = true;

  @Operation(
      summary = "Register new user and set HttpOnly token cookies.",
      description =
          "Registers a new user and sets an access token cookie and a refresh token cookie.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "User registered successfully",
        headers =
            @Header(
                name = "Set-Cookie",
                description = "access_token and refresh_token cookies; HttpOnly; Path=/")),
    @ApiResponse(responseCode = "400", description = "Invalid data", content = @Content),
    @ApiResponse(responseCode = "409", description = "User already exists", content = @Content)
  })
  @PostMapping("/register")
  public ResponseEntity<String> register(
      @RequestBody @Valid RegisterRequest request,
      @Parameter(hidden = true) HttpServletResponse response) {
    service.register(request, response);
    return ResponseEntity.ok("");
  }

  @Operation(
      summary = "Login and set HttpOnly token cookies.",
      description =
          "Verifies user credentials and sets short-lived access and long-lived refresh token cookies.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Login successful, token cookies set",
        headers =
            @Header(
                name = "Set-Cookie",
                description = "access_token and refresh_token cookies; HttpOnly; Path=/")),
    @ApiResponse(responseCode = "401", description = "Invalid credentials", content = @Content)
  })
  @PostMapping("/authenticate")
  public ResponseEntity<String> authenticate(
      @RequestBody AuthenticationRequest request,
      @Parameter(hidden = true) HttpServletResponse response) {
    service.authenticate(request, response);
    return ResponseEntity.ok("");
  }

  @Operation(
      summary = "Refresh access token",
      description = "Uses a valid refresh token cookie to issue a new access token cookie.")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Access token refreshed",
        headers = @Header(name = "Set-Cookie", description = "access_token=...; HttpOnly; Path=/")),
    @ApiResponse(
        responseCode = "401",
        description = "Invalid or expired refresh token",
        content = @Content)
  })
  @PostMapping("/refresh")
  public ResponseEntity<String> refresh(
      @CookieValue(name = JwtService.REFRESH_TOKEN_COOKIE, required = false) String refreshToken,
      @Parameter(hidden = true) HttpServletResponse response) {
    service.refresh(refreshToken, response);
    return ResponseEntity.ok("");
  }

  @Operation(
      summary = "Logout",
      description = "Delete the access and refresh token cookies to log out.")
  @ApiResponses({@ApiResponse(responseCode = "200", description = "Token cookies deleted")})
  @PostMapping("/logout")
  public ResponseEntity<String> logout(@Parameter(hidden = true) HttpServletResponse response) {
    expireCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    expireCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
    return ResponseEntity.ok("");
  }

  private void expireCookie(HttpServletResponse response, String name) {
    Cookie cookie = new Cookie(name, null);
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }
}
