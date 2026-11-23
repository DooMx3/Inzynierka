package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.offering.OfferingRequest;
import com.github.DooMx3.inzynierka.dto.offering.OfferingResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.OfferingService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Offerings", description = "Public wine offerings")
@RestController
@RequestMapping("/api/offerings")
@RequiredArgsConstructor
public class OfferingController {

  private final OfferingService offeringService;

  @GetMapping
  public ResponseEntity<List<OfferingResponse>> getAll() {
    return ResponseEntity.ok(
        offeringService.getAll().stream().map(OfferingResponse::from).toList());
  }

  @GetMapping("/{id}")
  public ResponseEntity<OfferingResponse> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(OfferingResponse.from(offeringService.getById(id)));
  }

  @GetMapping("/{id}/history")
  public ResponseEntity<BatchHistoryResponse> getHistory(@PathVariable UUID id) {
    return ResponseEntity.ok(offeringService.getHistory(id));
  }

  @PostMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<OfferingResponse> create(
      @RequestBody @Valid OfferingRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(OfferingResponse.from(offeringService.create(request, user)));
  }
}
