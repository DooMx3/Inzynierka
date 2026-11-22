package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.servlet.http.Cookie;
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

  @Mock private UserRepository repository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;
  @Mock private AuthenticationManager authenticationManager;

  @InjectMocks private AuthenticationService service;

  @Test
  void shouldGenerateNewTokenAndReplaceJwtCookie() {
    User user = User.builder().email("jan.kowalski@example.com").active(true).build();
    MockHttpServletResponse response = new MockHttpServletResponse();
    when(jwtService.generateToken(user)).thenReturn("new-jwt");

    service.refresh(user, response);

    verify(jwtService).generateToken(user);
    Cookie cookie = response.getCookie("jwt");
    assertEquals("new-jwt", cookie.getValue());
    assertEquals(86400, cookie.getMaxAge());
    assertEquals("/", cookie.getPath());
    assertEquals(true, cookie.isHttpOnly());
  }

  @Test
  void shouldRejectRefreshWithoutAuthenticatedUser() {
    MockHttpServletResponse response = new MockHttpServletResponse();

    assertThrows(UnauthorizedException.class, () -> service.refresh(null, response));
  }
}
