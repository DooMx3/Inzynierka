package com.github.DooMx3.inzynierka.controller;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.spraying.SprayingRequest;
import com.github.DooMx3.inzynierka.dto.spraying.SprayingResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.SprayingService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
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

@WebMvcTest(SprayingController.class)
@Import(TestSecurityConfig.class)
class SprayingControllerTest {

  private static final String BASE_URL = "/api/spraying";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private SprayingService sprayingService;

  private User user;
  private UUID sprayingId;
  private SprayingResponse spraying;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    sprayingId = UUID.randomUUID();
    spraying =
        new SprayingResponse(
            sprayingId,
            UUID.randomUUID(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            Instant.parse("2026-11-12T08:00:00Z"),
            25,
            Instant.parse("2026-11-19T08:00:00Z"));
  }

  @Test
  void shouldCreateSpraying() throws Exception {
    when(sprayingService.create(any(), eq(user))).thenReturn(spraying);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sprayingId.toString()))
        .andExpect(jsonPath("$.quantity").value(25));

    verify(sprayingService).create(any(), eq(user));
  }

  @Test
  void shouldCreatePlannedSprayingWithoutSprayingDate() throws Exception {
    when(sprayingService.create(any(), eq(user))).thenReturn(spraying);
    String requestWithNoSprayingDate =
        requestJson().replace("\"sprayingDate\":\"2026-11-12T08:00:00Z\"", "\"sprayingDate\":null");

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestWithNoSprayingDate))
        .andExpect(status().isOk());

    ArgumentCaptor<SprayingRequest> requestCaptor = ArgumentCaptor.forClass(SprayingRequest.class);
    verify(sprayingService).create(requestCaptor.capture(), eq(user));
    assertNull(requestCaptor.getValue().sprayingDate());
    assertNotNull(requestCaptor.getValue().due());
  }

  @Test
  void shouldAllowSprayingWithoutDueDateWhenSprayingDateIsProvided() throws Exception {
    when(sprayingService.create(any(), eq(user))).thenReturn(spraying);
    String requestWithoutDue =
        requestJson().replace("\"due\":\"2026-11-19T08:00:00Z\"", "\"due\":null");

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestWithoutDue))
        .andExpect(status().isOk());

    ArgumentCaptor<SprayingRequest> requestCaptor = ArgumentCaptor.forClass(SprayingRequest.class);
    verify(sprayingService).create(requestCaptor.capture(), eq(user));
    assertNotNull(requestCaptor.getValue().sprayingDate());
    assertNull(requestCaptor.getValue().due());
  }

  @Test
  void shouldRejectPlannedSprayingWithoutDueDate() throws Exception {
    String requestWithoutSprayingDateOrDue =
        requestJson()
            .replace("\"sprayingDate\":\"2026-11-12T08:00:00Z\"", "\"sprayingDate\":null")
            .replace("\"due\":\"2026-11-19T08:00:00Z\"", "\"due\":null");

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestWithoutSprayingDateOrDue))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(sprayingService);
  }

  @Test
  void shouldGetAllSpraying() throws Exception {
    when(sprayingService.getAll(user)).thenReturn(List.of(spraying));

    mockMvc
        .perform(get(BASE_URL).with(authentication(oenologist())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(sprayingId.toString()));

    verify(sprayingService).getAll(user);
  }

  @Test
  void shouldGetSprayingById() throws Exception {
    when(sprayingService.getById(sprayingId, user)).thenReturn(spraying);

    mockMvc
        .perform(get(BASE_URL + "/" + sprayingId).with(authentication(oenologist())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fieldId").value(spraying.fieldId().toString()));

    verify(sprayingService).getById(sprayingId, user);
  }

  @Test
  void shouldUpdateSpraying() throws Exception {
    when(sprayingService.update(eq(sprayingId), any(), eq(user))).thenReturn(spraying);

    mockMvc
        .perform(
            put(BASE_URL + "/" + sprayingId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson()))
        .andExpect(status().isOk());

    verify(sprayingService).update(eq(sprayingId), any(), eq(user));
  }

  @Test
  void shouldAllowOenologistToUpdateAndDeleteSpraying() throws Exception {
    when(sprayingService.update(eq(sprayingId), any(), eq(user))).thenReturn(spraying);

    mockMvc
        .perform(
            put(BASE_URL + "/" + sprayingId)
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson()))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(BASE_URL + "/" + sprayingId).with(authentication(oenologist())))
        .andExpect(status().isNoContent());

    verify(sprayingService).update(eq(sprayingId), any(), eq(user));
    verify(sprayingService).delete(sprayingId, user);
  }

  @Test
  void shouldDeleteSpraying() throws Exception {
    mockMvc
        .perform(delete(BASE_URL + "/" + sprayingId).with(authentication(owner())))
        .andExpect(status().isNoContent());

    verify(sprayingService).delete(sprayingId, user);
  }

  @Test
  void shouldRejectNonPositiveQuantity() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson().replace("\"quantity\":25", "\"quantity\":0")))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(sprayingService);
  }

  @Test
  void shouldAllowOenologistToCreateSpraying() throws Exception {
    when(sprayingService.create(any(), eq(user))).thenReturn(spraying);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson()))
        .andExpect(status().isOk());

    verify(sprayingService).create(any(), eq(user));
  }

  @Test
  void shouldRejectWorkerTryingToCreateSpraying() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(worker()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson()))
        .andExpect(status().isForbidden());

    verifyNoInteractions(sprayingService);
  }

  private String requestJson() {
    return """
        {
          "fieldId":"%s",
          "equipmentId":"%s",
          "substanceId":"%s",
          "sprayingDate":"2026-11-12T08:00:00Z",
          "quantity":25,
          "due":"2026-11-19T08:00:00Z"
        }
        """
        .formatted(spraying.fieldId(), spraying.equipmentId(), spraying.substanceId());
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication worker() {
    return authWith("WORKER");
  }

  private Authentication oenologist() {
    return authWith("OENOLOGIST");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
