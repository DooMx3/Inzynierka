package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchSourceResponse;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.BatchStage;
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

@WebMvcTest(BatchController.class)
@Import(TestSecurityConfig.class)
class BatchControllerTest {

  private static final String BASE_URL = "/api/batches";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private BatchService batchService;

  private User user;
  private UUID batchId;
  private UUID sourceId;
  private UUID sourceBatchId;
  private UUID targetBatchId;
  private UUID harvestId;
  private BatchResponse batch;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    batchId = UUID.randomUUID();
    sourceId = UUID.randomUUID();
    sourceBatchId = UUID.randomUUID();
    targetBatchId = UUID.randomUUID();
    harvestId = UUID.randomUUID();
    batch =
        new BatchResponse(
            batchId, "Solaris 2026", BatchStage.MUST, new BigDecimal("125.50"), false, false, null);
  }

  @Test
  void shouldCreateBatch() throws Exception {
    when(batchService.create(any(), eq(user))).thenReturn(batch);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(batchRequestJson()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(batchId.toString()))
        .andExpect(jsonPath("$.stage").value("MUST"))
        .andExpect(jsonPath("$.quantity").value(125.50));

    verify(batchService).create(any(), eq(user));
  }

  @Test
  void shouldCreateBatchFromHarvest() throws Exception {
    when(batchService.createFromHarvest(any(), eq(user))).thenReturn(batch);

    mockMvc
        .perform(
            post(BASE_URL + "/from-harvest")
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"name":"Solaris 2026","harvests":[{"harvestId":"%s","quantity":100}]}
                    """
                        .formatted(harvestId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Solaris 2026"));

    verify(batchService).createFromHarvest(any(), eq(user));
  }

  @Test
  void shouldGetBatchesAndBatchHistory() throws Exception {
    BatchHistoryResponse history = new BatchHistoryResponse(batch, List.of(), List.of(), List.of());
    when(batchService.getAll(user)).thenReturn(List.of(batch));
    when(batchService.getById(batchId, user)).thenReturn(batch);
    when(batchService.getHistory(batchId, user)).thenReturn(history);

    mockMvc
        .perform(get(BASE_URL).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(batchId.toString()));

    mockMvc
        .perform(get(BASE_URL + "/" + batchId).with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Solaris 2026"));

    mockMvc
        .perform(get(BASE_URL + "/" + batchId + "/history").with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.batch.id").value(batchId.toString()))
        .andExpect(jsonPath("$.harvestSources").isEmpty());

    verify(batchService).getAll(user);
    verify(batchService).getById(batchId, user);
    verify(batchService).getHistory(batchId, user);
  }

  @Test
  void shouldUpdateBatchStageSpoiledAndDeleteBatch() throws Exception {
    when(batchService.update(eq(batchId), any(), eq(user))).thenReturn(batch);
    when(batchService.changeStage(batchId, BatchStage.AGED, user)).thenReturn(batch);
    when(batchService.changeSpoiled(batchId, true, user)).thenReturn(batch);

    mockMvc
        .perform(
            put(BASE_URL + "/" + batchId)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(batchRequestJson()))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch(BASE_URL + "/" + batchId + "/stage")
                .param("stage", "AGED")
                .with(authentication(owner())))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch(BASE_URL + "/" + batchId + "/spoiled")
                .param("spoiled", "true")
                .with(authentication(owner())))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(BASE_URL + "/" + batchId).with(authentication(owner())))
        .andExpect(status().isNoContent());

    verify(batchService).update(eq(batchId), any(), eq(user));
    verify(batchService).changeStage(batchId, BatchStage.AGED, user);
    verify(batchService).changeSpoiled(batchId, true, user);
    verify(batchService).delete(batchId, user);
  }

  @Test
  void shouldAddAndUpdateHarvestSources() throws Exception {
    HarvestBatchResponse response =
        new HarvestBatchResponse(sourceId, harvestId, new BigDecimal("25.00"));
    when(batchService.addHarvestSource(eq(batchId), any(), eq(user))).thenReturn(response);
    when(batchService.updateHarvestSource(eq(sourceId), any(), eq(user))).thenReturn(response);

    String request =
        """
        {"harvestId":"%s","quantity":25}
        """
            .formatted(harvestId);

    mockMvc
        .perform(
            post(BASE_URL + "/" + batchId + "/harvest-sources")
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sourceId.toString()));

    mockMvc
        .perform(
            put(BASE_URL + "/harvest-sources/" + sourceId)
                .with(authentication(oenologist()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.harvestId").value(harvestId.toString()));

    verify(batchService).addHarvestSource(eq(batchId), any(), eq(user));
    verify(batchService).updateHarvestSource(eq(sourceId), any(), eq(user));
  }

  @Test
  void shouldCreateAndUpdateBatchSources() throws Exception {
    BatchSourceResponse response =
        new BatchSourceResponse(sourceId, sourceBatchId, targetBatchId, new BigDecimal("25.00"));
    when(batchService.createBatchSource(
            sourceBatchId, targetBatchId, new BigDecimal("25.00"), user))
        .thenReturn(response);
    when(batchService.updateBatchSource(
            sourceId, sourceBatchId, targetBatchId, new BigDecimal("25.00"), user))
        .thenReturn(response);

    mockMvc
        .perform(
            post(BASE_URL + "/" + sourceBatchId + "/sources/" + targetBatchId)
                .param("quantity", "25.00")
                .with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sourceBatchId").value(sourceBatchId.toString()));

    mockMvc
        .perform(
            put(BASE_URL + "/sources/" + sourceId)
                .param("sourceBatchId", sourceBatchId.toString())
                .param("targetBatchId", targetBatchId.toString())
                .param("quantity", "25.00")
                .with(authentication(owner())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.targetBatchId").value(targetBatchId.toString()));

    verify(batchService)
        .createBatchSource(sourceBatchId, targetBatchId, new BigDecimal("25.00"), user);
    verify(batchService)
        .updateBatchSource(sourceId, sourceBatchId, targetBatchId, new BigDecimal("25.00"), user);
  }

  @Test
  void shouldRejectInvalidBatchRequest() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"name":"Invalid","stage":"MUST","quantity":-1,"isSpoiled":false}
                    """))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(batchService);
  }

  @Test
  void shouldRejectWorkerAccess() throws Exception {
    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("WORKER"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(batchService);
  }

  private String batchRequestJson() {
    return """
        {"name":"Solaris 2026","stage":"MUST","quantity":125.50,"isSpoiled":false}
        """;
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication oenologist() {
    return authWith("OENOLOGIST");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
