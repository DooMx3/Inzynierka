package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.batch.BatchFromHarvestRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchSourceResponse;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchRequest;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.BatchStage;
import com.github.DooMx3.inzynierka.service.BatchService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Batches", description = "Management of production batches")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('OENOLOGIST')")
public class BatchController {
  private final BatchService batchService;

  @PostMapping
  public ResponseEntity<BatchResponse> create(
      @RequestBody @Valid BatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.create(request, user));
  }

  @PostMapping("/from-harvest")
  public ResponseEntity<BatchResponse> createFromHarvest(
      @RequestBody @Valid BatchFromHarvestRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.createFromHarvest(request, user));
  }

  @GetMapping
  public ResponseEntity<List<BatchResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getAll(user));
  }

  @GetMapping("/{id}")
  public ResponseEntity<BatchResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getById(id, user));
  }

  @GetMapping("/{id}/history")
  public ResponseEntity<BatchHistoryResponse> getHistory(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getHistory(id, user));
  }

  @PutMapping("/{id}")
  public ResponseEntity<BatchResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid BatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.update(id, request, user));
  }

  @PatchMapping("/{id}/stage")
  public ResponseEntity<BatchResponse> changeStage(
      @PathVariable UUID id,
      @RequestParam BatchStage stage,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.changeStage(id, stage, user));
  }

  @PatchMapping("/{id}/spoiled")
  public ResponseEntity<BatchResponse> changeSpoiled(
      @PathVariable UUID id,
      @RequestParam boolean spoiled,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.changeSpoiled(id, spoiled, user));
  }

  @PostMapping("/{batchId}/harvest-sources")
  public ResponseEntity<HarvestBatchResponse> addHarvestSource(
      @PathVariable UUID batchId,
      @RequestBody @Valid HarvestBatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.addHarvestSource(batchId, request, user));
  }

  @PutMapping("/harvest-sources/{sourceId}")
  public ResponseEntity<HarvestBatchResponse> updateHarvestSource(
      @PathVariable UUID sourceId,
      @RequestBody @Valid HarvestBatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.updateHarvestSource(sourceId, request, user));
  }

  @PostMapping("/{sourceBatchId}/sources/{targetBatchId}")
  public ResponseEntity<BatchSourceResponse> createBatchSource(
      @PathVariable UUID sourceBatchId,
      @PathVariable UUID targetBatchId,
      @RequestParam BigDecimal quantity,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(
        batchService.createBatchSource(sourceBatchId, targetBatchId, quantity, user));
  }

  @PutMapping("/sources/{sourceId}")
  public ResponseEntity<BatchSourceResponse> updateBatchSource(
      @PathVariable UUID sourceId,
      @RequestParam UUID sourceBatchId,
      @RequestParam UUID targetBatchId,
      @RequestParam BigDecimal quantity,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(
        batchService.updateBatchSource(sourceId, sourceBatchId, targetBatchId, quantity, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    batchService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
