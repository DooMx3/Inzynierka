package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.ingredient.IngredientResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.IngredientService;
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

@WebMvcTest(IngredientController.class)
@Import(TestSecurityConfig.class)
class IngredientControllerTest {
  private static final String BASE_URL = "/api/ingredients";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private IngredientService ingredientService;

  private User user;
  private UUID ingredientId;
  private IngredientResponse ingredient;

  @BeforeEach
  void setUp() {
    user = org.mockito.Mockito.mock(User.class);
    ingredientId = UUID.randomUUID();
    ingredient =
        new IngredientResponse(
            ingredientId,
            "ING-001",
            "Potassium metabisulfite",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);
  }

  @Test
  void shouldCreateAndListIngredients() throws Exception {
    when(ingredientService.create(any(), eq(user))).thenReturn(ingredient);
    when(ingredientService.getAll(user)).thenReturn(List.of(ingredient));

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.number").value("ING-001"));

    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].name").value("Potassium metabisulfite"));

    verify(ingredientService).create(any(), eq(user));
    verify(ingredientService).getAll(user);
  }

  @Test
  void shouldUpdateAndDeleteIngredient() throws Exception {
    when(ingredientService.update(eq(ingredientId), any(), eq(user))).thenReturn(ingredient);

    mockMvc
        .perform(
            put(BASE_URL + "/" + ingredientId)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson()))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(BASE_URL + "/" + ingredientId).with(authentication(authWith("OWNER"))))
        .andExpect(status().isNoContent());

    verify(ingredientService).update(eq(ingredientId), any(), eq(user));
    verify(ingredientService).delete(ingredientId, user);
  }

  @Test
  void shouldRejectInvalidNutrientsAndUnauthorisedRoles() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson().replace("\"fat\":0", "\"fat\":-1")))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("WORKER"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(ingredientService);
  }

  private String ingredientJson() {
    return """
        {"name":"Potassium metabisulfite","energyContent":0,"fat":0,
         "saturatedFattyAcids":0,"carbs":0,"sugars":0,"protein":0,"salt":0,"fibers":0}
        """;
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
