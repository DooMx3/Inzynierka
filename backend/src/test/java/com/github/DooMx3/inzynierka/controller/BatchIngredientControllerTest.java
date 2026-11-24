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
import com.github.DooMx3.inzynierka.dto.ingredient.BatchIngredientResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.BatchService;
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

@WebMvcTest(BatchIngredientController.class)
@Import(TestSecurityConfig.class)
class BatchIngredientControllerTest {
  private static final String BASE_URL = "/api/batches/%s/ingredients";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private BatchService batchService;

  private User user;
  private UUID batchId;
  private UUID entryId;
  private BatchIngredientResponse response;

  @BeforeEach
  void setUp() {
    user = org.mockito.Mockito.mock(User.class);
    batchId = UUID.randomUUID();
    entryId = UUID.randomUUID();
    response =
        new BatchIngredientResponse(
            entryId,
            UUID.randomUUID(),
            "ING-001",
            "Potassium metabisulfite",
            new BigDecimal("25.50"));
  }

  @Test
  void shouldListAddUpdateAndRemoveBatchIngredients() throws Exception {
    String url = BASE_URL.formatted(batchId);
    when(batchService.getBatchIngredients(batchId, user)).thenReturn(List.of(response));
    when(batchService.addBatchIngredient(eq(batchId), any(), eq(user))).thenReturn(response);
    when(batchService.updateBatchIngredient(eq(batchId), eq(entryId), any(), eq(user)))
        .thenReturn(response);

    mockMvc
        .perform(get(url).with(authentication(authWith("OENOLOGIST"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].quantityGrams").value(25.50));

    mockMvc
        .perform(
            post(url)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.ingredientNumber").value("ING-001"));

    mockMvc
        .perform(
            put(url + "/" + entryId)
                .with(authentication(authWith("OWNER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson()))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(url + "/" + entryId).with(authentication(authWith("OWNER"))))
        .andExpect(status().isNoContent());

    verify(batchService).getBatchIngredients(batchId, user);
    verify(batchService).addBatchIngredient(eq(batchId), any(), eq(user));
    verify(batchService).updateBatchIngredient(eq(batchId), eq(entryId), any(), eq(user));
    verify(batchService).deleteBatchIngredient(batchId, entryId, user);
  }

  @Test
  void shouldRejectNonPositiveQuantity() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL.formatted(batchId))
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(ingredientJson().replace("25.5", "0")))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(batchService);
  }

  private String ingredientJson() {
    return """
        {"ingredientId":"%s","quantityGrams":25.5}
        """
        .formatted(response.ingredientId());
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
