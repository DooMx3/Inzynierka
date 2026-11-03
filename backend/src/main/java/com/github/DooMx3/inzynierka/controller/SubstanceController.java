package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.substance.SubstancePatchRequest;
import com.github.DooMx3.inzynierka.dto.substance.SubstanceRequest;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.SubstanceService;
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

@Tag(name = "Substances", description = "Management of organisation substances")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/substances")
@RequiredArgsConstructor
public class SubstanceController {

  private final SubstanceService substanceService;

  @Operation(summary = "Create substance")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Substance created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content)
  })
  @PostMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Substance> create(
      @RequestBody @Valid SubstanceRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(substanceService.create(request, user));
  }

  @Operation(summary = "List active substances")
  @GetMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<List<Substance>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(substanceService.getAll(user));
  }

  @Operation(summary = "Get substance")
  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Substance> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(substanceService.getById(id, user));
  }

  @Operation(summary = "Replace substance")
  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Substance> update(
      @PathVariable UUID id,
      @RequestBody @Valid SubstanceRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(substanceService.update(id, request, user));
  }

  @Operation(summary = "Partially update substance")
  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Substance> patch(
      @PathVariable UUID id,
      @RequestBody @Valid SubstancePatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(substanceService.patch(id, request, user));
  }

  @Operation(summary = "Deactivate substance")
  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    substanceService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
