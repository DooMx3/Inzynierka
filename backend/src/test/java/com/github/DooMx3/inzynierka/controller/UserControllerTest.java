package com.github.DooMx3.inzynierka.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.dto.user.ResetPasswordRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.UserService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@WebMvcTest(UserController.class)
@Import(TestSecurityConfig.class)
class UserControllerTest {

  private static final String BASE_URL = "/api/user";
  private static final String USER_EMAIL = "jan.kowalski@example.com";

  @Autowired private MockMvc mockMvc;

  @MockitoBean private JwtService jwtService;

  @MockitoBean private UserService userService;

  private User user;

  @BeforeEach
  void setUp() {
    user = new User();
    user.setEmail(USER_EMAIL);
  }

  private RequestPostProcessor authenticated() {
    return authentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
  }

  @Nested
  class GetUser {

    @Test
    void shouldReturn200AndJsonBody() throws Exception {
      mockMvc
          .perform(get(BASE_URL + "/info").with(authenticated()))
          .andExpect(status().isOk())
          .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc.perform(get(BASE_URL + "/info")).andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class ChangePassword {

    private static final String VALID_CHANGE_PASSWORD_REQUEST =
        """
            {
              "oldPassword": "Secret123!",
              "newPassword": "NewSecret456!"
            }
            """;

    @Test
    void shouldReturn200AndPassDataToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/change-password")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_CHANGE_PASSWORD_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string("Password changed successfully"));

      ArgumentCaptor<ChangePasswordRequest> captor =
          ArgumentCaptor.forClass(ChangePasswordRequest.class);
      verify(userService).changePassword(captor.capture(), eq(USER_EMAIL));

      assertThat(captor.getValue()).isNotNull();
      assertThat(captor.getValue().oldPassword()).isEqualTo("Secret123!");
      assertThat(captor.getValue().newPassword()).isEqualTo("NewSecret456!");
    }

    @Test
    void shouldReturn400WhenAllFieldsAreMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/change-password")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/change-password")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/change-password")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/change-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_CHANGE_PASSWORD_REQUEST))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class DeactivateUser {

    private static final String VALID_DEACTIVATE_REQUEST =
        """
            {
              "password": "Secret123!"
            }
            """;

    @Test
    void shouldReturn200AndPassDataToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/deactivate")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_DEACTIVATE_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string("User deactivated successfully"));

      ArgumentCaptor<DeactivateUserRequest> captor =
          ArgumentCaptor.forClass(DeactivateUserRequest.class);
      verify(userService).deactivateUser(captor.capture(), eq(USER_EMAIL));

      assertThat(captor.getValue()).isNotNull();
      assertThat(captor.getValue().password()).isEqualTo("Secret123!");
    }

    @Test
    void shouldReturn400WhenAllFieldsAreMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/deactivate")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/deactivate")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/deactivate")
                  .with(authenticated())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/deactivate")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_DEACTIVATE_REQUEST))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class ForgotPassword {

    private static final String EXPECTED_MESSAGE =
        "If an account with that email exists, a reset link has been sent.";

    private static final String VALID_FORGOT_PASSWORD_REQUEST =
        """
            {
              "email": "jan.kowalski@example.com"
            }
            """;

    @Test
    void shouldReturn200AndPassEmailToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/forgot-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_FORGOT_PASSWORD_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string(EXPECTED_MESSAGE));

      verify(userService).sendPasswordResetEmail(USER_EMAIL);
    }

    @Test
    void shouldReturn400WhenAllFieldsAreMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/forgot-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenEmailIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/forgot-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"email": ""}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenEmailHasInvalidFormat() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/forgot-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"email": "not-an-email"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/forgot-password").contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/forgot-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class ResetPassword {

    private static final String VALID_RESET_PASSWORD_REQUEST =
        """
            {
              "token": "valid-reset-token",
              "newPassword": "NewSecret456!"
            }
            """;

    @Test
    void shouldReturn200AndPassDataToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/reset-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_RESET_PASSWORD_REQUEST))
          .andExpect(status().isOk())
          .andExpect(content().string("Password reset successfully."));

      ArgumentCaptor<ResetPasswordRequest> captor =
          ArgumentCaptor.forClass(ResetPasswordRequest.class);
      verify(userService).resetPassword(captor.capture());

      assertThat(captor.getValue()).isNotNull();
      assertThat(captor.getValue().token()).isEqualTo("valid-reset-token");
      assertThat(captor.getValue().newPassword()).isEqualTo("NewSecret456!");
    }

    @Test
    void shouldReturn400WhenAllFieldsAreMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/reset-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/reset-password").contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/reset-password")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class GetInvitations {

    @Test
    void shouldReturn200AndEmptyListWhenNoInvitations() throws Exception {
      when(userService.getInvitations(user)).thenReturn(List.of());

      mockMvc
          .perform(get(BASE_URL + "/invitations").with(authenticated()))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray())
          .andExpect(jsonPath("$").isEmpty());

      verify(userService).getInvitations(user);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc.perform(get(BASE_URL + "/invitations")).andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class AcceptInvitation {

    private final UUID organisationId = UUID.randomUUID();

    @Test
    void shouldReturn204AndPassDataToService() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/invitations/{organisationId}/accept", organisationId)
                  .with(authenticated()))
          .andExpect(status().isNoContent())
          .andExpect(content().string(""));

      verify(userService).acceptInvitation(organisationId, user);
    }

    @Test
    void shouldReturn400WhenOrganisationIdIsNotValidUuid() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL + "/invitations/{organisationId}/accept", "not-a-uuid")
                  .with(authenticated()))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(post(BASE_URL + "/invitations/{organisationId}/accept", organisationId))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }

  @Nested
  class RejectInvitation {

    private final UUID organisationId = UUID.randomUUID();

    @Test
    void shouldReturn204AndPassDataToService() throws Exception {
      mockMvc
          .perform(
              delete(BASE_URL + "/invitations/{organisationId}", organisationId)
                  .with(authenticated()))
          .andExpect(status().isNoContent())
          .andExpect(content().string(""));

      verify(userService).rejectInvitation(organisationId, user);
    }

    @Test
    void shouldReturn400WhenOrganisationIdIsNotValidUuid() throws Exception {
      mockMvc
          .perform(
              delete(BASE_URL + "/invitations/{organisationId}", "not-a-uuid")
                  .with(authenticated()))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(userService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(delete(BASE_URL + "/invitations/{organisationId}", organisationId))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(userService);
    }
  }
}
