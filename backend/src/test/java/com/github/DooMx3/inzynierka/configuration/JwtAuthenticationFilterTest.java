package com.github.DooMx3.inzynierka.configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.service.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

  @Mock private JwtService jwtService;

  @Mock private UserDetailsService userDetailsService;

  private JwtAuthenticationFilter filter;

  @BeforeEach
  void setUp() {
    filter = new JwtAuthenticationFilter(jwtService, userDetailsService);
    SecurityContextHolder.clearContext();
  }

  @Test
  void shouldExpireCookieAndContinueWhenJwtIsMalformed() throws Exception {
    MockHttpServletRequest request = requestWithJwt("malformed-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain filterChain = new MockFilterChain();
    when(jwtService.extractUsername("malformed-token")).thenThrow(new JwtException("Invalid JWT"));

    filter.doFilter(request, response, filterChain);

    Cookie expiredCookie = response.getCookie(JwtService.ACCESS_TOKEN_COOKIE);
    assertEquals(0, expiredCookie.getMaxAge());
    assertEquals("/", expiredCookie.getPath());
    assertEquals(request, filterChain.getRequest());
  }

  @Test
  void shouldExpireCookieWhenJwtIsNotValidForUser() throws Exception {
    MockHttpServletRequest request = requestWithJwt("expired-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain filterChain = new MockFilterChain();
    UserDetails userDetails =
        User.withUsername("user@example.com").password("password").authorities("USER").build();
    when(jwtService.extractUsername("expired-token")).thenReturn("user@example.com");
    when(userDetailsService.loadUserByUsername("user@example.com")).thenReturn(userDetails);
    when(jwtService.isAccessTokenValid("expired-token", userDetails)).thenReturn(false);

    filter.doFilter(request, response, filterChain);

    assertEquals(0, response.getCookie(JwtService.ACCESS_TOKEN_COOKIE).getMaxAge());
  }

  @Test
  void shouldRejectDisabledAccountAndExpireBothTokenCookies() throws Exception {
    MockHttpServletRequest request = requestWithJwt("valid-token");
    request.setCookies(
        new Cookie(JwtService.ACCESS_TOKEN_COOKIE, "valid-token"),
        new Cookie(JwtService.REFRESH_TOKEN_COOKIE, "valid-refresh-token"));
    MockHttpServletResponse response = new MockHttpServletResponse();
    UserDetails disabledUser =
        User.withUsername("disabled@example.com")
            .password("password")
            .authorities("USER")
            .disabled(true)
            .build();
    when(jwtService.extractUsername("valid-token")).thenReturn("disabled@example.com");
    when(userDetailsService.loadUserByUsername("disabled@example.com")).thenReturn(disabledUser);

    filter.doFilter(request, response, new MockFilterChain());

    assertNull(SecurityContextHolder.getContext().getAuthentication());
    assertEquals(0, response.getCookie(JwtService.ACCESS_TOKEN_COOKIE).getMaxAge());
    assertEquals(0, response.getCookie(JwtService.REFRESH_TOKEN_COOKIE).getMaxAge());
    verify(jwtService, never()).isAccessTokenValid("valid-token", disabledUser);
  }

  private MockHttpServletRequest requestWithJwt(String token) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie(JwtService.ACCESS_TOKEN_COOKIE, token));
    return request;
  }
}
