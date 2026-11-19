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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

  @Operation(summary = "Create batch", description = "Creates an empty production batch.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content)
  })
  @PostMapping
  public ResponseEntity<BatchResponse> create(
      @RequestBody @Valid BatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.create(request, user));
  }

  @Operation(
      summary = "Create batch from harvest",
      description = "Creates a production batch from one or more harvest sources.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Related harvest not found",
        content = @Content)
  })
  @PostMapping("/from-harvest")
  public ResponseEntity<BatchResponse> createFromHarvest(
      @RequestBody @Valid BatchFromHarvestRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.createFromHarvest(request, user));
  }

  @Operation(summary = "List batches")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batches returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content)
  })
  @GetMapping
  public ResponseEntity<List<BatchResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getAll(user));
  }

  @Operation(summary = "Get batch")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @GetMapping("/{id}")
  public ResponseEntity<BatchResponse> getById(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getById(id, user));
  }

  @Operation(
      summary = "Get batch history",
      description = "Returns the batch and its harvest and batch sources.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch history returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @GetMapping("/{id}/history")
  public ResponseEntity<BatchHistoryResponse> getHistory(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getHistory(id, user));
  }

  @Operation(summary = "Replace batch", description = "Fully replaces the batch data.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @PutMapping("/{id}")
  public ResponseEntity<BatchResponse> update(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @RequestBody @Valid BatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.update(id, request, user));
  }

  @Operation(summary = "Change batch stage")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch stage updated"),
    @ApiResponse(responseCode = "400", description = "Invalid batch stage", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @PatchMapping("/{id}/stage")
  public ResponseEntity<BatchResponse> changeStage(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @Parameter(description = "New production stage") @RequestParam BatchStage stage,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.changeStage(id, stage, user));
  }

  @Operation(summary = "Change batch spoiled state")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch spoiled state updated"),
    @ApiResponse(responseCode = "400", description = "Invalid spoiled value", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @PatchMapping("/{id}/spoiled")
  public ResponseEntity<BatchResponse> changeSpoiled(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @Parameter(description = "Whether the batch is spoiled") @RequestParam boolean spoiled,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.changeSpoiled(id, spoiled, user));
  }

  @Operation(summary = "Add harvest source to batch")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Harvest source added"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or harvest not found",
        content = @Content)
  })
  @PostMapping("/{batchId}/harvest-sources")
  public ResponseEntity<HarvestBatchResponse> addHarvestSource(
      @Parameter(description = "Target batch identifier") @PathVariable UUID batchId,
      @RequestBody @Valid HarvestBatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.addHarvestSource(batchId, request, user));
  }

  @Operation(summary = "Update harvest source")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Harvest source updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Harvest source or harvest not found",
        content = @Content)
  })
  @PutMapping("/harvest-sources/{sourceId}")
  public ResponseEntity<HarvestBatchResponse> updateHarvestSource(
      @Parameter(description = "Harvest source identifier") @PathVariable UUID sourceId,
      @RequestBody @Valid HarvestBatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.updateHarvestSource(sourceId, request, user));
  }

  @Operation(
      summary = "Create batch source",
      description = "Connects a source batch to a target batch with a transferred quantity.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch source created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Source or target batch not found",
        content = @Content)
  })
  @PostMapping("/{sourceBatchId}/sources/{targetBatchId}")
  public ResponseEntity<BatchSourceResponse> createBatchSource(
      @Parameter(description = "Source batch identifier") @PathVariable UUID sourceBatchId,
      @Parameter(description = "Target batch identifier") @PathVariable UUID targetBatchId,
      @Parameter(description = "Transferred quantity") @RequestParam BigDecimal quantity,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(
        batchService.createBatchSource(sourceBatchId, targetBatchId, quantity, user));
  }

  @Operation(
      summary = "Update batch source",
      description = "Updates the source batch, target batch, and quantity.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch source updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch source or related batch not found",
        content = @Content)
  })
  @PutMapping("/sources/{sourceId}")
  public ResponseEntity<BatchSourceResponse> updateBatchSource(
      @Parameter(description = "Batch source identifier") @PathVariable UUID sourceId,
      @Parameter(description = "Source batch identifier") @RequestParam UUID sourceBatchId,
      @Parameter(description = "Target batch identifier") @RequestParam UUID targetBatchId,
      @Parameter(description = "Transferred quantity") @RequestParam BigDecimal quantity,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(
        batchService.updateBatchSource(sourceId, sourceBatchId, targetBatchId, quantity, user));
  }

  @Operation(summary = "Delete batch")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Batch deleted", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @Parameter(description = "Batch identifier") @PathVariable UUID id,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    batchService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
