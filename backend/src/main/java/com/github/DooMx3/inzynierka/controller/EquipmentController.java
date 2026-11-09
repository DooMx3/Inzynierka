package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.equipment.EquipmentRequest;
import com.github.DooMx3.inzynierka.dto.equipment.EquipmentResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.EquipmentService;
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

@Tag(name = "Equipment", description = "Management of organisation equipment")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class EquipmentController {

  private final EquipmentService equipmentService;

  @PostMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<EquipmentResponse> create(
      @RequestBody @Valid EquipmentRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(equipmentService.create(request, user));
  }

  @GetMapping
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
  public ResponseEntity<List<EquipmentResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(equipmentService.getAll(user));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
  public ResponseEntity<EquipmentResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(equipmentService.getById(id, user));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<EquipmentResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid EquipmentRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(equipmentService.update(id, request, user));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    equipmentService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
