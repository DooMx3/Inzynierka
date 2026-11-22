package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.record.RecordRequest;
import com.github.DooMx3.inzynierka.dto.record.RecordResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.RecordService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Chemical records", description = "Chemical parameter readings for production batches")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/batches/{batchId}/records")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('OENOLOGIST')")
public class BatchRecordController {

  private final RecordService recordService;

  @PostMapping
  public ResponseEntity<RecordResponse> create(
      @PathVariable UUID batchId,
      @RequestBody @Valid RecordRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.create(batchId, request, user));
  }

  @GetMapping
  public ResponseEntity<List<RecordResponse>> getAll(
      @PathVariable UUID batchId, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.getAll(batchId, user));
  }

  @GetMapping("/{recordId}")
  public ResponseEntity<RecordResponse> getById(
      @PathVariable UUID batchId,
      @PathVariable UUID recordId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.getById(batchId, recordId, user));
  }

  @PutMapping("/{recordId}")
  public ResponseEntity<RecordResponse> update(
      @PathVariable UUID batchId,
      @PathVariable UUID recordId,
      @RequestBody @Valid RecordRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.update(batchId, recordId, request, user));
  }

  @DeleteMapping("/{recordId}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID batchId,
      @PathVariable UUID recordId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    recordService.delete(batchId, recordId, user);
    return ResponseEntity.noContent().build();
  }
}
