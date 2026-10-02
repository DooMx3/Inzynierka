package com.github.DooMx3.inzynierka.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OrganisationController.class)
@Import(TestSecurityConfig.class)
class OrganisationControllerTest {

  private static final String BASE_URL = "/api/organisations";

  private static final String VALID_REQUEST =
      """
            {
              "name": "Acme",
              "taxId": "1234567890",
              "street": "Główna 1",
              "postalCode": "00-001",
              "city": "Warszawa",
              "logoPath": "/logo.png",
              "motto": "Just do it"
            }
            """;

  @Autowired private MockMvc mockMvc;

  @MockitoBean private JwtService jwtService;

  @MockitoBean private OrganisationService organisationService;

  private User user;
  private UUID organisationId;
  private Organisation organisation;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    organisationId = UUID.randomUUID();
    organisation = new Organisation();
    organisation.setId(organisationId);
    organisation.setName("Acme");
    organisation.setTaxId("1234567890");
    organisation.setStreet("Główna 1");
    organisation.setPostalCode("00-001");
    organisation.setCity("Warszawa");
    organisation.setLogoPath("/logo.png");
    organisation.setMotto("Just do it");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication notOwner() {
    return authWith("MEMBER");
  }

  @Nested
  class CreateOrganisation {

    @Test
    void shouldReturn200AndCreatedOrganisation() throws Exception {
      when(organisationService.createOrganisation(any(OrganisationRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(organisationId.toString()))
          .andExpect(jsonPath("$.name").value("Acme"));

      ArgumentCaptor<OrganisationRequest> captor =
          ArgumentCaptor.forClass(OrganisationRequest.class);
      verify(organisationService).createOrganisation(captor.capture(), eq(user));

      OrganisationRequest captured = captor.getValue();
      assertThat(captured.name()).isEqualTo("Acme");
      assertThat(captured.taxId()).isEqualTo("1234567890");
      assertThat(captured.street()).isEqualTo("Główna 1");
      assertThat(captured.postalCode()).isEqualTo("00-001");
      assertThat(captured.city()).isEqualTo("Warszawa");
      assertThat(captured.logoPath()).isEqualTo("/logo.png");
      assertThat(captured.motto()).isEqualTo("Just do it");
    }

    @Test
    void shouldReturn200WhenOnlyRequiredFieldsAreProvided() throws Exception {
      when(organisationService.createOrganisation(any(OrganisationRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "Acme", "city": "Warszawa"}
                                    """))
          .andExpect(status().isOk());
    }

    @Test
    void shouldReturn400WhenNameIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "", "city": "Warszawa"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenNameIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"city": "Warszawa"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenCityIsBlank() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "Acme", "city": ""}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenCityIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "Acme"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenJsonIsMalformed() throws Exception {
      mockMvc
          .perform(
              post(BASE_URL)
                  .with(authentication(authWith("USER")))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{ not json"))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(post(BASE_URL).contentType(MediaType.APPLICATION_JSON).content(VALID_REQUEST))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(organisationService);
    }
  }

  @Nested
  class GetOrganisationById {

    @Test
    void shouldReturn200AndOrganisationForOwner() throws Exception {
      when(organisationService.getOrganisation(organisationId, user)).thenReturn(organisation);

      mockMvc
          .perform(get(BASE_URL + "/{id}", organisationId).with(authentication(owner())))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(organisationId.toString()))
          .andExpect(jsonPath("$.name").value("Acme"));

      verify(organisationService).getOrganisation(organisationId, user);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc.perform(get(BASE_URL + "/{id}", organisationId)).andExpect(status().isUnauthorized());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn403WhenUserIsNotOwner() throws Exception {
      mockMvc
          .perform(get(BASE_URL + "/{id}", organisationId).with(authentication(notOwner())))
          .andExpect(status().isForbidden());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn404WhenOrganisationNotFound() throws Exception {
      when(organisationService.getOrganisation(organisationId, user))
          .thenThrow(new ResourceNotFoundException("Organisation not found: " + organisationId));

      mockMvc
          .perform(get(BASE_URL + "/{id}", organisationId).with(authentication(owner())))
          .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400WhenIdIsNotValidUuid() throws Exception {
      mockMvc
          .perform(get(BASE_URL + "/{id}", "not-a-uuid").with(authentication(owner())))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }
  }

  @Nested
  class UpdateOrganisation {

    @Test
    void shouldReturn200AndUpdatedOrganisationForOwner() throws Exception {
      when(organisationService.updateOrganisation(
              eq(organisationId), any(OrganisationRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(organisationId.toString()));
    }

    @Test
    void shouldPassRequestBodyToService() throws Exception {
      when(organisationService.updateOrganisation(
              eq(organisationId), any(OrganisationRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isOk());

      ArgumentCaptor<OrganisationRequest> captor =
          ArgumentCaptor.forClass(OrganisationRequest.class);
      verify(organisationService)
          .updateOrganisation(eq(organisationId), captor.capture(), eq(user));

      assertThat(captor.getValue().name()).isEqualTo("Acme");
      assertThat(captor.getValue().city()).isEqualTo("Warszawa");
    }

    @Test
    void shouldReturn400WhenNameIsBlank() throws Exception {
      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "", "city": "Warszawa"}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenCityIsBlank() throws Exception {
      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"name": "Acme", "city": ""}
                                    """))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn403WhenUserIsNotOwner() throws Exception {
      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(notOwner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isForbidden());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn404WhenOrganisationNotFound() throws Exception {
      when(organisationService.updateOrganisation(
              eq(organisationId), any(OrganisationRequest.class), eq(user)))
          .thenThrow(new ResourceNotFoundException("Organisation not found: " + organisationId));

      mockMvc
          .perform(
              put(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(VALID_REQUEST))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  class PatchOrganisation {

    @Test
    void shouldReturn200AndPatchedOrganisationForOwner() throws Exception {
      when(organisationService.patchOrganisation(
              eq(organisationId), any(OrganisationPatchRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"motto": "New motto"}
                                    """))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(organisationId.toString()));
    }

    @Test
    void shouldPassOnlyProvidedFieldsToService() throws Exception {
      when(organisationService.patchOrganisation(
              eq(organisationId), any(OrganisationPatchRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(
                      """
                                    {"motto": "New motto", "city": "Kraków"}
                                    """))
          .andExpect(status().isOk());

      ArgumentCaptor<OrganisationPatchRequest> captor =
          ArgumentCaptor.forClass(OrganisationPatchRequest.class);
      verify(organisationService).patchOrganisation(eq(organisationId), captor.capture(), eq(user));

      OrganisationPatchRequest captured = captor.getValue();
      assertThat(captured.motto()).isEqualTo("New motto");
      assertThat(captured.city()).isEqualTo("Kraków");
      assertThat(captured.name()).isNull();
      assertThat(captured.taxId()).isNull();
      assertThat(captured.street()).isNull();
      assertThat(captured.postalCode()).isNull();
      assertThat(captured.logoPath()).isNull();
    }

    @Test
    void shouldReturn200WhenBodyIsEmptyObject() throws Exception {
      when(organisationService.patchOrganisation(
              eq(organisationId), any(OrganisationPatchRequest.class), eq(user)))
          .thenReturn(organisation);

      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isOk());
    }

    @Test
    void shouldReturn400WhenBodyIsMissing() throws Exception {
      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn403WhenUserIsNotOwner() throws Exception {
      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(notOwner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isForbidden());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn404WhenOrganisationNotFound() throws Exception {
      when(organisationService.patchOrganisation(
              eq(organisationId), any(OrganisationPatchRequest.class), eq(user)))
          .thenThrow(new ResourceNotFoundException("Organisation not found: " + organisationId));

      mockMvc
          .perform(
              patch(BASE_URL + "/{id}", organisationId)
                  .with(authentication(owner()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isNotFound());
    }
  }

  @Nested
  class DeleteOrganisation {

    @Test
    void shouldReturn204ForOwner() throws Exception {
      mockMvc
          .perform(delete(BASE_URL + "/{id}", organisationId).with(authentication(owner())))
          .andExpect(status().isNoContent());

      verify(organisationService).deleteOrganisation(organisationId, user);
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
      mockMvc
          .perform(delete(BASE_URL + "/{id}", organisationId))
          .andExpect(status().isUnauthorized());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn403WhenUserIsNotOwner() throws Exception {
      mockMvc
          .perform(delete(BASE_URL + "/{id}", organisationId).with(authentication(notOwner())))
          .andExpect(status().isForbidden());

      verifyNoInteractions(organisationService);
    }

    @Test
    void shouldReturn404WhenOrganisationNotFound() throws Exception {
      doThrow(new ResourceNotFoundException("Organisation not found: " + organisationId))
          .when(organisationService)
          .deleteOrganisation(organisationId, user);

      mockMvc
          .perform(delete(BASE_URL + "/{id}", organisationId).with(authentication(owner())))
          .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturn400WhenIdIsNotValidUuid() throws Exception {
      mockMvc
          .perform(delete(BASE_URL + "/{id}", "not-a-uuid").with(authentication(owner())))
          .andExpect(status().isBadRequest());

      verifyNoInteractions(organisationService);
    }
  }
}
