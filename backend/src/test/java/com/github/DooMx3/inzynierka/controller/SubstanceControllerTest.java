package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.SubstanceService;
import java.util.*;
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

@WebMvcTest(SubstanceController.class)
@Import(TestSecurityConfig.class)
class SubstanceControllerTest {

  private static final String BASE_URL = "/api/substances";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private SubstanceService substanceService;

  private User user;
  private UUID substanceId;
  private Substance substance;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    substanceId = UUID.randomUUID();
    substance = new Substance();
    substance.setId(substanceId);
    substance.setName("Cabernet");
  }

  @Test
  void shouldCreateSubstance() throws Exception {
    when(substanceService.create(any(), eq(user))).thenReturn(substance);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Cabernet"}
                        """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(substanceId.toString()))
        .andExpect(jsonPath("$.name").value("Cabernet"));

    verify(substanceService).create(any(), eq(user));
  }

  @Test
  void shouldGetAllSubstances() throws Exception {
    when(substanceService.getAll(user)).thenReturn(List.of(substance));

    mockMvc
        .perform(get(BASE_URL).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Cabernet"));

    verify(substanceService).getAll(user);
  }

  @Test
  void shouldGetSubstanceById() throws Exception {
    when(substanceService.getById(substanceId, user)).thenReturn(substance);

    mockMvc
        .perform(get(BASE_URL + "/" + substanceId).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Cabernet"));

    verify(substanceService).getById(substanceId, user);
  }

  @Test
  void shouldUpdateSubstance() throws Exception {
    when(substanceService.update(eq(substanceId), any(), eq(user))).thenReturn(substance);

    mockMvc
        .perform(
            put(BASE_URL + "/" + substanceId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Merlot"}
                        """))
        .andExpect(status().isOk());

    verify(substanceService).update(eq(substanceId), any(), eq(user));
  }

  @Test
  void shouldPatchSubstance() throws Exception {
    when(substanceService.patch(eq(substanceId), any(), eq(user))).thenReturn(substance);

    mockMvc
        .perform(
            patch(BASE_URL + "/" + substanceId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":"Merlot"}
                        """))
        .andExpect(status().isOk());

    verify(substanceService).patch(eq(substanceId), any(), eq(user));
  }

  @Test
  void shouldDeleteSubstance() throws Exception {
    mockMvc
        .perform(delete(BASE_URL + "/" + substanceId).with(authentication(owner())))
        .andExpect(status().isNoContent());

    verify(substanceService).delete(substanceId, user);
  }

  @Test
  void shouldRejectBlankName() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"name":""}
                        """))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(substanceService);
  }

  @Test
  void shouldRejectNonOwnerOrWorker() throws Exception {
    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("OENOLOGIST"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(substanceService);
  }

  @Test
  void shouldRejectUnauthenticatedRequest() throws Exception {
    mockMvc.perform(get(BASE_URL)).andExpect(status().isUnauthorized());

    verifyNoInteractions(substanceService);
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
