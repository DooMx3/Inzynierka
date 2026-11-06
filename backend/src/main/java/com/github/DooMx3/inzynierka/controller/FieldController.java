package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.field.FieldRequest;
import com.github.DooMx3.inzynierka.dto.field.FieldResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.FieldService;
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

@Tag(name = "Fields", description = "Management of organisation fields")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
public class FieldController {

  private final FieldService fieldService;

  @PostMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<FieldResponse> create(
      @RequestBody @Valid FieldRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(fieldService.create(request, user));
  }

  @GetMapping
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER')")
  public ResponseEntity<List<FieldResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(fieldService.getAll(user));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER')")
  public ResponseEntity<FieldResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(fieldService.getById(id, user));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<FieldResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid FieldRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(fieldService.update(id, request, user));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    fieldService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
