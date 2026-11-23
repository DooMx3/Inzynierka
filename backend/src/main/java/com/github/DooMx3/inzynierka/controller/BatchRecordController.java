package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.record.RecordRequest;
import com.github.DooMx3.inzynierka.dto.record.RecordResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.RecordService;
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

@Tag(name = "Chemical records", description = "Chemical parameter readings for production batches")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/batches/{batchId}/records")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('OENOLOGIST')")
public class BatchRecordController {

  private final RecordService recordService;

  @Operation(
      summary = "Create chemical record",
      description = "Records chemical parameter readings for a production batch.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Chemical record created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @PostMapping
  public ResponseEntity<RecordResponse> create(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @RequestBody @Valid RecordRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.create(batchId, request, user));
  }

  @Operation(summary = "List chemical records", description = "Lists active records for a batch.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Chemical records returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Batch not found", content = @Content)
  })
  @GetMapping
  public ResponseEntity<List<RecordResponse>> getAll(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.getAll(batchId, user));
  }

  @Operation(summary = "Get chemical record")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Chemical record returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or record not found",
        content = @Content)
  })
  @GetMapping("/{recordId}")
  public ResponseEntity<RecordResponse> getById(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(description = "Chemical record identifier") @PathVariable UUID recordId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.getById(batchId, recordId, user));
  }

  @Operation(summary = "Replace chemical record", description = "Fully replaces the record values.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Chemical record updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or record not found",
        content = @Content)
  })
  @PutMapping("/{recordId}")
  public ResponseEntity<RecordResponse> update(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(description = "Chemical record identifier") @PathVariable UUID recordId,
      @RequestBody @Valid RecordRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(recordService.update(batchId, recordId, request, user));
  }

  @Operation(summary = "Delete chemical record", description = "Soft-deletes a chemical record.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Chemical record deleted"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Batch or record not found",
        content = @Content)
  })
  @DeleteMapping("/{recordId}")
  public ResponseEntity<Void> delete(
      @Parameter(description = "Production batch identifier") @PathVariable UUID batchId,
      @Parameter(description = "Chemical record identifier") @PathVariable UUID recordId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    recordService.delete(batchId, recordId, user);
    return ResponseEntity.noContent().build();
  }
}
