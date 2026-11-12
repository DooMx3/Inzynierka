package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.pest.PestObservationResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.PestObservationType;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.PestObservationService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PestObservationController.class)
@Import(TestSecurityConfig.class)
class PestObservationControllerTest {

  private static final String BASE_URL = "/api/pest-observations";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private PestObservationService pestObservationService;

  private User user;
  private UUID observationId;
  private UUID fieldId;
  private PestObservationResponse observation;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    observationId = UUID.randomUUID();
    fieldId = UUID.randomUUID();
    observation =
        new PestObservationResponse(
            observationId,
            fieldId,
            PestObservationType.PEST,
            "Grape berry moth",
            LocalDate.of(2026, 6, 12),
            "White spots on leaves",
            true);
  }

  @Test
  void shouldCreateObservationForWorker() throws Exception {
    when(pestObservationService.create(any(), eq(user))).thenReturn(observation);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"fieldId":"%s","type":"PEST","name":"Powdery mildew","observedAt":"2026-06-12","description":"White spots on leaves"}
                        """
                        .formatted(fieldId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fieldId").value(fieldId.toString()))
        .andExpect(jsonPath("$.type").value("PEST"))
        .andExpect(jsonPath("$.observedAt").value("2026-06-12"));

    verify(pestObservationService).create(any(), eq(user));
  }

  @Test
  void shouldGetAndDeleteObservation() throws Exception {
    when(pestObservationService.getAll(fieldId, user)).thenReturn(List.of(observation));

    mockMvc
        .perform(
            get(BASE_URL)
                .param("fieldId", fieldId.toString())
                .with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Grape berry moth"));

    mockMvc
        .perform(get(BASE_URL + "/" + observationId).with(authentication(authWith("WORKER"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(BASE_URL + "/" + observationId).with(authentication(authWith("WORKER"))))
        .andExpect(status().isNoContent());

    verify(pestObservationService).getAll(fieldId, user);
    verify(pestObservationService).getById(observationId, user);
    verify(pestObservationService).delete(observationId, user);
  }

  @Test
  void shouldRejectInvalidRequest() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"fieldId":"%s","type":"PEST","name":" ","observedAt":null}
                        """
                        .formatted(fieldId)))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(pestObservationService);
  }

  @Test
  void shouldRejectOenologist() throws Exception {
    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("OENOLOGIST"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(pestObservationService);
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
