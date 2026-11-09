package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.equipment.EquipmentResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.EquipmentService;
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

@WebMvcTest(EquipmentController.class)
@Import(TestSecurityConfig.class)
class EquipmentControllerTest {

  private static final String BASE_URL = "/api/equipment";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private EquipmentService equipmentService;

  private User user;
  private UUID equipmentId;
  private EquipmentResponse equipment;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    equipmentId = UUID.randomUUID();
    equipment =
        new EquipmentResponse(equipmentId, "Fermentor", "Winery", LocalDate.of(2027, 5, 1), true);
  }

  @Test
  void shouldCreateEquipment() throws Exception {
    when(equipmentService.create(any(), eq(user))).thenReturn(equipment);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Fermentor","type":"Winery","endOfTechnicalInspection":"2027-05-01"}
                        """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(equipmentId.toString()))
        .andExpect(jsonPath("$.name").value("Fermentor"))
        .andExpect(jsonPath("$.type").value("Winery"))
        .andExpect(jsonPath("$.endOfTechnicalInspection").value("2027-05-01"));

    verify(equipmentService).create(any(), eq(user));
  }

  @Test
  void shouldGetAllEquipment() throws Exception {
    when(equipmentService.getAll(user)).thenReturn(List.of(equipment));

    mockMvc
        .perform(get(BASE_URL).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Fermentor"));

    verify(equipmentService).getAll(user);
  }

  @Test
  void shouldGetEquipmentById() throws Exception {
    when(equipmentService.getById(equipmentId, user)).thenReturn(equipment);

    mockMvc
        .perform(get(BASE_URL + "/" + equipmentId).with(authentication(worker())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("Winery"));

    verify(equipmentService).getById(equipmentId, user);
  }

  @Test
  void shouldAllowOenologistToListEquipment() throws Exception {
    when(equipmentService.getAll(user)).thenReturn(List.of(equipment));

    mockMvc
        .perform(get(BASE_URL).with(authentication(oenologist())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Fermentor"));

    verify(equipmentService).getAll(user);
  }

  @Test
  void shouldAllowOenologistToGetEquipmentById() throws Exception {
    when(equipmentService.getById(equipmentId, user)).thenReturn(equipment);

    mockMvc
        .perform(get(BASE_URL + "/" + equipmentId).with(authentication(oenologist())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Fermentor"));

    verify(equipmentService).getById(equipmentId, user);
  }

  @Test
  void shouldUpdateEquipment() throws Exception {
    when(equipmentService.update(eq(equipmentId), any(), eq(user))).thenReturn(equipment);

    mockMvc
        .perform(
            put(BASE_URL + "/" + equipmentId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Updated fermentor","type":"Winery","endOfTechnicalInspection":null}
                        """))
        .andExpect(status().isOk());

    verify(equipmentService).update(eq(equipmentId), any(), eq(user));
  }

  @Test
  void shouldDeleteEquipment() throws Exception {
    mockMvc
        .perform(delete(BASE_URL + "/" + equipmentId).with(authentication(owner())))
        .andExpect(status().isNoContent());

    verify(equipmentService).delete(equipmentId, user);
  }

  @Test
  void shouldRejectBlankEquipmentName() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":" ","type":"Winery"}
                        """))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(equipmentService);
  }

  @Test
  void shouldRejectMissingEquipmentType() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Fermentor","type":" "}
                        """))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(equipmentService);
  }

  @Test
  void shouldRejectWorkerTryingToCreateEquipment() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(worker()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Fermentor","type":"Winery"}
                        """))
        .andExpect(status().isForbidden());

    verifyNoInteractions(equipmentService);
  }

  @Test
  void shouldRejectOenologistTryingToUpdateEquipment() throws Exception {
    mockMvc
        .perform(
            put(BASE_URL + "/" + equipmentId)
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Updated fermentor","type":"Winery"}
                        """))
        .andExpect(status().isForbidden());

    verifyNoInteractions(equipmentService);
  }

  @Test
  void shouldRejectUnauthenticatedRequest() throws Exception {
    mockMvc.perform(get(BASE_URL)).andExpect(status().isUnauthorized());

    verifyNoInteractions(equipmentService);
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
