package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.PendingInvitationResponse;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @PostMapping
    public ResponseEntity<Organisation> create(
            @RequestBody @Valid OrganisationRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.createOrganisation(request, user)
        );
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.getOrganisation(id, user)
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> update(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.updateOrganisation(id, request, user)
        );
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> patch(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationPatchRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.patchOrganisation(id, request, user)
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        organisationService.deleteOrganisation(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invitations")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Void> invite(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationInvitationRequest request,
            @AuthenticationPrincipal User user
    ) {
        organisationService.inviteUser(id, request, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/invitations")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<List<PendingInvitationResponse>> getPendingInvitations(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.getPendingInvitations(id, user)
        );
    }

    @DeleteMapping("/{id}/invitations/{userId}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Void> cancelInvitation(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User user
    ) {
        organisationService.cancelInvitation(id, userId, user);
        return ResponseEntity.noContent().build();
    }
}