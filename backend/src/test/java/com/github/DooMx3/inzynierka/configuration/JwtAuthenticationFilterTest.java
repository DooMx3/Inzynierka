package com.github.DooMx3.inzynierka.configuration;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
  }

  @Test
  void shouldExpireCookieAndContinueWhenJwtIsMalformed() throws Exception {
    MockHttpServletRequest request = requestWithJwt("malformed-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain filterChain = new MockFilterChain();
    when(jwtService.extractUsername("malformed-token")).thenThrow(new JwtException("Invalid JWT"));

    filter.doFilter(request, response, filterChain);

    Cookie expiredCookie = response.getCookie("jwt");
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
    when(jwtService.isTokenValid("expired-token", userDetails)).thenReturn(false);

    filter.doFilter(request, response, filterChain);

    assertEquals(0, response.getCookie("jwt").getMaxAge());
  }

  private MockHttpServletRequest requestWithJwt(String token) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setCookies(new Cookie("jwt", token));
    return request;
  }
}
