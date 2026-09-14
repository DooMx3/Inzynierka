package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.CreateOrganisationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.UpdateOrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @PostMapping
    public ResponseEntity<Organisation> create(
            @RequestBody CreateOrganisationRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(organisationService.createOrganisation(request, user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Organisation> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(organisationService.getOrganisation(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Organisation> update(
            @PathVariable UUID id,
            @RequestBody UpdateOrganisationRequest request
    ) {
        return ResponseEntity.ok(organisationService.updateOrganisation(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        organisationService.deleteOrganisation(id);
        return ResponseEntity.noContent().build();
    }
}
