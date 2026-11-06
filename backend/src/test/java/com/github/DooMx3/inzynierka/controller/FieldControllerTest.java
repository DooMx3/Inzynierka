package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.field.FieldResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import com.github.DooMx3.inzynierka.service.FieldService;
import com.github.DooMx3.inzynierka.service.JwtService;
import java.math.BigDecimal;
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

@WebMvcTest({FieldController.class, GrapeCatalogController.class})
@Import(TestSecurityConfig.class)
class FieldControllerTest {

  private static final String BASE_URL = "/api/fields";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private FieldService fieldService;

  private User user;
  private UUID fieldId;
  private FieldResponse field;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    fieldId = UUID.randomUUID();
    field =
        new FieldResponse(
            fieldId,
            new BigDecimal("4.25"),
            GrapeVariety.SOLARIS,
            "Solaris",
            GrapeColor.WHITE,
            true);
  }

  @Test
  void shouldCreateField() throws Exception {
    when(fieldService.create(any(), eq(user))).thenReturn(field);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"areaAre":4.25,"grapeVariety":"SOLARIS","grapeColor":"WHITE"}
                        """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(fieldId.toString()))
        .andExpect(jsonPath("$.grapeVarietyName").value("Solaris"));

    verify(fieldService).create(any(), eq(user));
  }

  @Test
  void shouldGetAllFields() throws Exception {
    when(fieldService.getAll(user)).thenReturn(List.of(field));

    mockMvc
        .perform(get(BASE_URL).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].areaAre").value(4.25));

    verify(fieldService).getAll(user);
  }

  @Test
  void shouldUpdateField() throws Exception {
    when(fieldService.update(eq(fieldId), any(), eq(user))).thenReturn(field);

    mockMvc
        .perform(
            put(BASE_URL + "/" + fieldId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"areaAre":4.25,"grapeVariety":"SOLARIS","grapeColor":"WHITE"}
                        """))
        .andExpect(status().isOk());

    verify(fieldService).update(eq(fieldId), any(), eq(user));
  }

  @Test
  void shouldSoftDeleteField() throws Exception {
    mockMvc
        .perform(delete(BASE_URL + "/" + fieldId).with(authentication(owner())))
        .andExpect(status().isNoContent());

    verify(fieldService).delete(fieldId, user);
  }

  @Test
  void shouldAllowWorkerToReadButNotModifyFields() throws Exception {
    when(fieldService.getAll(user)).thenReturn(List.of(field));

    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("WORKER"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"areaAre":4.25,"grapeVariety":"SOLARIS","grapeColor":"WHITE"}
                        """))
        .andExpect(status().isForbidden());

    verify(fieldService).getAll(user);
    verify(fieldService, never()).create(any(), any());
  }

  @Test
  void shouldReturnPredefinedGrapeTypesAndColors() throws Exception {
    mockMvc
        .perform(get("/api/grape-types").with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].value").value("SOLARIS"))
        .andExpect(jsonPath("$[12].requiresCustomName").value(true));

    mockMvc
        .perform(get("/api/grape-colors").with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0]").value("RED"))
        .andExpect(jsonPath("$[1]").value("WHITE"));
  }

  @Test
  void shouldRejectInvalidFieldValues() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"areaAre":0,"grapeVariety":"SOLARIS","grapeColor":"WHITE"}
                        """))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(fieldService);
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
