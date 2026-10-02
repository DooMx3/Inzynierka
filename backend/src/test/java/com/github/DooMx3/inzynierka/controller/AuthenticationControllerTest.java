package com.github.DooMx3.inzynierka.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.user.AuthenticationRequest;
import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.exceptions.InvalidCredentialsException;
import com.github.DooMx3.inzynierka.exceptions.ResourceAlreadyExistsException;
import com.github.DooMx3.inzynierka.service.AuthenticationService;
import com.github.DooMx3.inzynierka.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthenticationController.class)
@Import(TestSecurityConfig.class)
class AuthenticationControllerTest {

  private static final String BASE_URL = "/api/auth";

  private static final String VALID_REGISTER_REQUEST =
      """
            {
              "firstname": "Jan",
              "email": "jan.kowalski@example.com",
              "password": "Secret123!"
            }
            """;

  private static final String VALID_AUTHENTICATE_REQUEST =
      """
            {
              "email": "jan.kowalski@example.com",
              "password": "Secret123!"
            }
            """;

  @Autowired private MockMvc mockMvc;

  @MockitoBean private JwtService jwtService;

  @MockitoBean private AuthenticationService authenticationService;

  @Nested
  class Register {

    @Test
    void shouldReturn200AndEmptyBody() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REGISTER_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string(""));
    }

    @Test
    void shouldPassRequestBodyAndResponseToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REGISTER_REQUEST))
          .andExpect(status().isOk());

      ArgumentCaptor<RegisterRequest> captor = ArgumentCaptor.forClass(RegisterRequest.class);
      verify(authenticationService).register(captor.capture(), any(HttpServletResponse.class));

      RegisterRequest captured = captor.getValue();
      assertThat(captured.firstname()).isEqualTo("Jan");
      assertThat(captured.email()).isEqualTo("jan.kowalski@example.com");
      assertThat(captured.password()).isEqualTo("Secret123!");
    }

    @Test
    void shouldReturn400WhenAllFieldsAreMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenFirstnameIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "", "email": "jan.kowalski@example.com", "password": "Secret123!"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenFirstnameIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"email": "jan.kowalski@example.com", "password": "Secret123!"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenEmailIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "Jan", "email": "", "password": "Secret123!"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenEmailIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "Jan", "password": "Secret123!"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenEmailHasInvalidFormat() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "Jan", "email": "not-an-email", "password": "Secret123!"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenPasswordIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "Jan", "email": "jan.kowalski@example.com", "password": ""}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenPasswordIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"firstname": "Jan", "email": "jan.kowalski@example.com"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/register").contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn409WhenUserAlreadyExists() throws Exception {
      doThrow(new ResourceAlreadyExistsException("User with this email already exists"))
          .when(authenticationService)
          .register(any(RegisterRequest.class), any(HttpServletResponse.class));

      mockMvc
          .perform(
              post(BASE_URL + "/register")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REGISTER_REQUEST))
          .andExpect(status().isConflict());
    }
  }

  @Nested
  class Authenticate {

    @Test
    void shouldReturn200AndEmptyBody() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/authenticate")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_AUTHENTICATE_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string(""));
    }

    @Test
    void shouldPassRequestBodyAndResponseToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/authenticate")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_AUTHENTICATE_REQUEST))
          .andExpect(status().isOk());

      ArgumentCaptor<AuthenticationRequest> captor =
          ArgumentCaptor.forClass(AuthenticationRequest.class);
      verify(authenticationService).authenticate(captor.capture(), any(HttpServletResponse.class));

      AuthenticationRequest captured = captor.getValue();
      assertThat(captured.email()).isEqualTo("jan.kowalski@example.com");
      assertThat(captured.password()).isEqualTo("Secret123!");
    }

    @Test
    void shouldReturn401WhenCredentialsAreInvalid() throws Exception {
      doThrow(new InvalidCredentialsException("Invalid credentials"))
          .when(authenticationService)
          .authenticate(any(AuthenticationRequest.class), any(HttpServletResponse.class));

      mockMvc
          .perform(
              post(BASE_URL + "/authenticate")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_AUTHENTICATE_REQUEST))
          .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/authenticate").contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/authenticate")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(authenticationService);
    }
  }

  @Nested
  class Logout {

    @Test
    void shouldReturn200AndEmptyBody() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/logout"))
          .andExpect(status().isOk())
          .andExpect(content().string(""));
    }

    @Test
    void shouldExpireJwtCookie() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/logout"))
          .andExpect(status().isOk())
          .andExpect(cookie().exists("jwt"))
          .andExpect(cookie().maxAge("jwt", 0))
          .andExpect(cookie().httpOnly("jwt", true))
          .andExpect(cookie().path("jwt", "/"));
    }

    @Test
    void shouldNotInteractWithAuthenticationService() throws Exception {
      mockMvc.perform(post(BASE_URL + "/logout")).andExpect(status().isOk());

      verifyNoInteractions(authenticationService);
    }
  }
}
