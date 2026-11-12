package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.harvest.HarvestRequest;
import com.github.DooMx3.inzynierka.dto.harvest.HarvestResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.HarvestService;
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

@Tag(name = "Harvests", description = "Management of grape harvest records")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/harvests")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER')")
public class HarvestController {

  private final HarvestService harvestService;

  @PostMapping
  public ResponseEntity<HarvestResponse> create(
      @RequestBody @Valid HarvestRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(harvestService.create(request, user));
  }

  @GetMapping
  public ResponseEntity<List<HarvestResponse>> getAll(
      @RequestParam(required = false) UUID fieldId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(harvestService.getAll(fieldId, user));
  }

  @GetMapping("/{id}")
  public ResponseEntity<HarvestResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(harvestService.getById(id, user));
  }

  @PutMapping("/{id}")
  public ResponseEntity<HarvestResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid HarvestRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(harvestService.update(id, request, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    harvestService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
