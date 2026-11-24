package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.ingredient.BatchIngredientRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.BatchIngredientResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.BatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

@Tag(name = "Batch ingredients", description = "Ingredients used in production batches")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/batches/{batchId}/ingredients")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('OENOLOGIST')")
public class BatchIngredientController {
  private final BatchService batchService;

  @Operation(
      summary = "List batch ingredients",
      description = "Returns each ingredient and its quantity recorded for the batch.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch ingredients returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @GetMapping
  public ResponseEntity<List<BatchIngredientResponse>> getAll(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.getBatchIngredients(batchId, user));
  }

  @Operation(summary = "Add ingredient to batch")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Ingredient added to batch"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or ingredient not found",
        content = @Content)
  })
  @PostMapping
  public ResponseEntity<BatchIngredientResponse> add(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @RequestBody @Valid BatchIngredientRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.addBatchIngredient(batchId, request, user));
  }

  @Operation(summary = "Update ingredient quantity in batch")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Batch ingredient updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch, batch ingredient, or ingredient not found",
        content = @Content)
  })
  @PutMapping("/{entryId}")
  public ResponseEntity<BatchIngredientResponse> update(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(description = "Batch ingredient entry identifier") @PathVariable UUID entryId,
      @RequestBody @Valid BatchIngredientRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(batchService.updateBatchIngredient(batchId, entryId, request, user));
  }

  @Operation(summary = "Remove ingredient from batch")
  @ApiResponses({
    @ApiResponse(
        responseCode = "204",
        description = "Batch ingredient removed",
        content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or batch ingredient not found",
        content = @Content)
  })
  @DeleteMapping("/{entryId}")
  public ResponseEntity<Void> delete(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(description = "Batch ingredient entry identifier") @PathVariable UUID entryId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    batchService.deleteBatchIngredient(batchId, entryId, user);
    return ResponseEntity.noContent().build();
  }
}
