package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @PostMapping
    public ResponseEntity<Organisation> create(
            @RequestBody @Valid OrganisationRequest request
    ) {
        return ResponseEntity.ok(
                organisationService.createOrganisation(request)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Organisation> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(
                organisationService.getOrganisation(id)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<Organisation> update(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationRequest request
    ) {
        return ResponseEntity.ok(
                organisationService.updateOrganisation(id, request)
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Organisation> patch(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationPatchRequest request
    ) {
        return ResponseEntity.ok(
                organisationService.patchOrganisation(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        organisationService.deleteOrganisation(id);
        return ResponseEntity.noContent().build();
    }
}