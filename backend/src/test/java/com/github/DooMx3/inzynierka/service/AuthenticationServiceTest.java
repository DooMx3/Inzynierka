package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

  private static final String PASSWORD = "Superextrasecurepassword1!";

  @Mock private UserRepository repository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;
  @Mock private AuthenticationManager authenticationManager;

  @InjectMocks private AuthenticationService service;

  @Test
  void shouldIssueAccessAndRefreshCookiesAfterRegistration() {
    MockHttpServletResponse response = new MockHttpServletResponse();
    when(passwordEncoder.encode(PASSWORD)).thenReturn("hashed-password");
    when(jwtService.generateAccessToken(org.mockito.ArgumentMatchers.any(User.class)))
        .thenReturn("access-token");
    when(jwtService.generateRefreshToken(org.mockito.ArgumentMatchers.any(User.class)))
        .thenReturn("refresh-token");

    service.register(new RegisterRequest("Jan", "Kowalski", "jan@example.com", PASSWORD), response);

    Cookie accessCookie = response.getCookie(JwtService.ACCESS_TOKEN_COOKIE);
    Cookie refreshCookie = response.getCookie(JwtService.REFRESH_TOKEN_COOKIE);
    assertEquals("access-token", accessCookie.getValue());
    assertEquals(JwtService.ACCESS_TOKEN_MAX_AGE_SECONDS, accessCookie.getMaxAge());
    assertEquals("refresh-token", refreshCookie.getValue());
    assertEquals(JwtService.REFRESH_TOKEN_MAX_AGE_SECONDS, refreshCookie.getMaxAge());
    assertEquals(true, accessCookie.isHttpOnly());
    assertEquals(true, refreshCookie.isHttpOnly());
  }

  @Test
  void shouldIssueNewAccessCookieForValidRefreshToken() {
    User user = User.builder().email("jan.kowalski@example.com").active(true).build();
    MockHttpServletResponse response = new MockHttpServletResponse();
    when(jwtService.extractUsername("valid-refresh-token")).thenReturn(user.getEmail());
    when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(jwtService.isRefreshTokenValid("valid-refresh-token", user)).thenReturn(true);
    when(jwtService.generateAccessToken(user)).thenReturn("new-access-token");

    service.refresh("valid-refresh-token", response);

    verify(jwtService).generateAccessToken(user);
    Cookie cookie = response.getCookie(JwtService.ACCESS_TOKEN_COOKIE);
    assertEquals("new-access-token", cookie.getValue());
    assertEquals(JwtService.ACCESS_TOKEN_MAX_AGE_SECONDS, cookie.getMaxAge());
    assertEquals("/", cookie.getPath());
    assertEquals(true, cookie.isHttpOnly());
    assertNull(response.getCookie(JwtService.REFRESH_TOKEN_COOKIE));
  }

  @Test
  void shouldRejectMissingRefreshTokenAndExpireBothCookies() {
    MockHttpServletResponse response = new MockHttpServletResponse();

    assertThrows(UnauthorizedException.class, () -> service.refresh(null, response));

    assertExpiredCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    assertExpiredCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
  }

  @Test
  void shouldRejectMalformedRefreshTokenAndExpireBothCookies() {
    MockHttpServletResponse response = new MockHttpServletResponse();
    when(jwtService.extractUsername("malformed"))
        .thenThrow(new JwtException("Invalid refresh token"));

    assertThrows(UnauthorizedException.class, () -> service.refresh("malformed", response));

    assertExpiredCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    assertExpiredCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
  }

  @Test
  void shouldRejectDisabledAccountWithoutValidatingRefreshToken() {
    User user = User.builder().email("disabled@example.com").active(false).build();
    MockHttpServletResponse response = new MockHttpServletResponse();
    when(jwtService.extractUsername("valid-refresh-token")).thenReturn(user.getEmail());
    when(repository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

    assertThrows(
        UnauthorizedException.class, () -> service.refresh("valid-refresh-token", response));

    verify(jwtService, never()).isRefreshTokenValid("valid-refresh-token", user);
    assertExpiredCookie(response, JwtService.ACCESS_TOKEN_COOKIE);
    assertExpiredCookie(response, JwtService.REFRESH_TOKEN_COOKIE);
  }

  private void assertExpiredCookie(MockHttpServletResponse response, String name) {
    Cookie cookie = response.getCookie(name);
      assert cookie != null;
      assertEquals(0, cookie.getMaxAge());
    assertEquals("/", cookie.getPath());
    assertTrue(cookie.isHttpOnly());
  }
}
