package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.record.RecordResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.RecordService;
import java.math.BigDecimal;
import java.time.Instant;
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

@WebMvcTest(BatchRecordController.class)
@Import(TestSecurityConfig.class)
class BatchRecordControllerTest {

  private static final String BASE_URL = "/api/batches/%s/records";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private RecordService recordService;

  private User user;
  private UUID batchId;
  private UUID recordId;
  private RecordResponse record;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    batchId = UUID.randomUUID();
    recordId = UUID.randomUUID();
    record =
        new RecordResponse(
            recordId,
            batchId,
            Instant.parse("2026-11-22T17:00:00Z"),
            new BigDecimal("215.00"),
            new BigDecimal("6.80"),
            new BigDecimal("3.35"),
            new BigDecimal("18.50"),
            new BigDecimal("0.00"));
  }

  @Test
  void shouldCreateAndListRecordsForBatch() throws Exception {
    String url = BASE_URL.formatted(batchId);
    when(recordService.create(eq(batchId), any(), eq(user))).thenReturn(record);
    when(recordService.getAll(batchId, user)).thenReturn(List.of(record));

    mockMvc
        .perform(
            post(url)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"sugarLevel":215,"acidity":6.8,"pH":3.35,"temperature":18.5,"alcoholContent":0}
                        """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.batchId").value(batchId.toString()))
        .andExpect(jsonPath("$.pH").value(3.35))
        .andExpect(jsonPath("$.temperature").value(18.5));

    mockMvc
        .perform(get(url).with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(recordId.toString()));

    verify(recordService).create(eq(batchId), any(), eq(user));
    verify(recordService).getAll(batchId, user);
  }

  @Test
  void shouldGetUpdateAndDeleteRecordWithinBatch() throws Exception {
    String url = BASE_URL.formatted(batchId) + "/" + recordId;
    when(recordService.getById(batchId, recordId, user)).thenReturn(record);
    when(recordService.update(eq(batchId), eq(recordId), any(), eq(user))).thenReturn(record);

    mockMvc
        .perform(get(url).with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(recordId.toString()));

    mockMvc
        .perform(
            put(url)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                        {"sugarLevel":215,"acidity":6.8,"pH":3.35,"temperature":18.5,"alcoholContent":0}
                        """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.batchId").value(batchId.toString()));

    mockMvc
        .perform(delete(url).with(authentication(authWith("OWNER"))))
        .andExpect(status().isNoContent());

    verify(recordService).getById(batchId, recordId, user);
    verify(recordService).update(eq(batchId), eq(recordId), any(), eq(user));
    verify(recordService).delete(batchId, recordId, user);
  }

  @Test
  void shouldRejectEmptyMeasurementRequest() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL.formatted(batchId))
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(recordService);
  }

  @Test
  void shouldRejectWorkerAccess() throws Exception {
    mockMvc
        .perform(get(BASE_URL.formatted(batchId)).with(authentication(authWith("WORKER"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(recordService);
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
