package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.pest.PestObservationRequest;
import com.github.DooMx3.inzynierka.dto.pest.PestObservationResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.PestObservationService;
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

@Tag(name = "Pest observations", description = "Management of observed pests and plant diseases")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/pest-observations")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER')")
public class PestObservationController {

  private final PestObservationService pestObservationService;

  @PostMapping
  public ResponseEntity<PestObservationResponse> create(
      @RequestBody @Valid PestObservationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(pestObservationService.create(request, user));
  }

  @GetMapping
  public ResponseEntity<List<PestObservationResponse>> getAll(
      @RequestParam(required = false) UUID fieldId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(pestObservationService.getAll(fieldId, user));
  }

  @GetMapping("/{id}")
  public ResponseEntity<PestObservationResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(pestObservationService.getById(id, user));
  }

  @PutMapping("/{id}")
  public ResponseEntity<PestObservationResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid PestObservationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(pestObservationService.update(id, request, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    pestObservationService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
