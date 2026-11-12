package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.harvest.HarvestResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import com.github.DooMx3.inzynierka.service.HarvestService;
import com.github.DooMx3.inzynierka.service.JwtService;
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

@WebMvcTest(HarvestController.class)
@Import(TestSecurityConfig.class)
class HarvestControllerTest {

  private static final String BASE_URL = "/api/harvests";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private HarvestService harvestService;

  private User user;
  private UUID harvestId;
  private UUID fieldId;
  private HarvestResponse harvest;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    harvestId = UUID.randomUUID();
    fieldId = UUID.randomUUID();
    harvest =
        new HarvestResponse(
            harvestId,
            fieldId,
            GrapeVariety.SOLARIS,
            "Solaris",
            125,
            LocalDate.of(2026, 9, 20),
            true);
  }

  @Test
  void shouldCreateHarvestForWorker() throws Exception {
    when(harvestService.create(any(), eq(user))).thenReturn(harvest);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"fieldId":"%s","amountKg":125,"harvestDate":"2026-09-20"}
                        """
                        .formatted(fieldId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fieldId").value(fieldId.toString()))
        .andExpect(jsonPath("$.grapeVarietyName").value("Solaris"))
        .andExpect(jsonPath("$.amountKg").value(125))
        .andExpect(jsonPath("$.harvestDate").value("2026-09-20"));

    verify(harvestService).create(any(), eq(user));
  }

  @Test
  void shouldListGetAndDeleteHarvest() throws Exception {
    when(harvestService.getAll(fieldId, user)).thenReturn(List.of(harvest));
    when(harvestService.getById(harvestId, user)).thenReturn(harvest);

    mockMvc
        .perform(
            get(BASE_URL)
                .param("fieldId", fieldId.toString())
                .with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].amountKg").value(125));

    mockMvc
        .perform(get(BASE_URL + "/" + harvestId).with(authentication(authWith("WORKER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(harvestId.toString()));

    mockMvc
        .perform(delete(BASE_URL + "/" + harvestId).with(authentication(authWith("WORKER"))))
        .andExpect(status().isNoContent());

    verify(harvestService).getAll(fieldId, user);
    verify(harvestService).getById(harvestId, user);
    verify(harvestService).delete(harvestId, user);
  }

  @Test
  void shouldUpdateHarvest() throws Exception {
    when(harvestService.update(eq(harvestId), any(), eq(user))).thenReturn(harvest);

    mockMvc
        .perform(
            put(BASE_URL + "/" + harvestId)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"fieldId":"%s","amountKg":125,"harvestDate":"2026-09-20"}
                        """
                        .formatted(fieldId)))
        .andExpect(status().isOk());

    verify(harvestService).update(eq(harvestId), any(), eq(user));
  }

  @Test
  void shouldRejectNonPositiveAmount() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"fieldId":"%s","amountKg":0,"harvestDate":"2026-09-20"}
                        """
                        .formatted(fieldId)))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(harvestService);
  }

  @Test
  void shouldRejectOenologist() throws Exception {
    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("OENOLOGIST"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(harvestService);
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
