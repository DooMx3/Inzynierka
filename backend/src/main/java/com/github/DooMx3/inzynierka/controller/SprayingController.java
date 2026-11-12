package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.spraying.SprayingRequest;
import com.github.DooMx3.inzynierka.dto.spraying.SprayingResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.SprayingService;
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

@Tag(name = "Spraying", description = "Management of organisation spraying records")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/spraying")
@RequiredArgsConstructor
public class SprayingController {

  private final SprayingService sprayingService;

  @Operation(summary = "Create spraying record")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Spraying record created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content)
  })
  @PostMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<SprayingResponse> create(
      @RequestBody @Valid SprayingRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(sprayingService.create(request, user));
  }

  @Operation(summary = "List spraying records")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Spraying records returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner, worker, or oenologist required",
        content = @Content)
  })
  @GetMapping
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
  public ResponseEntity<List<SprayingResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(sprayingService.getAll(user));
  }

  @Operation(summary = "Get spraying record")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Spraying record returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner, worker, or oenologist required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Spraying record not found",
        content = @Content)
  })
  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
  public ResponseEntity<SprayingResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(sprayingService.getById(id, user));
  }

  @Operation(summary = "Replace spraying record")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Spraying record updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Spraying record or related resource not found",
        content = @Content)
  })
  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<SprayingResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid SprayingRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(sprayingService.update(id, request, user));
  }

  @Operation(summary = "Delete spraying record")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Spraying record deleted", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "Spraying record not found",
        content = @Content)
  })
  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    sprayingService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
