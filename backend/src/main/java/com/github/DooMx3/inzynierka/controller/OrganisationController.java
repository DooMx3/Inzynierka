package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.PendingInvitationResponse;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@Tag(name = "Organisations", description = "Management of organisations")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @Operation(
            summary = "Create organisation",
            description = "Creates a new organisation for the authenticated user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Organisation created"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @PostMapping
    public ResponseEntity<Organisation> create(
            @RequestBody @Valid OrganisationRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.createOrganisation(request, user)
        );
    }

    @Operation(
            summary = "Get organisation by ID",
            description = "Returns the organisation with the given ID. Requires the OWNER authority."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Organisation found"),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
            @ApiResponse(responseCode = "403", description = "Access denied (OWNER authority required)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Organisation not found", content = @Content)
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> getById(
            @Parameter(description = "Organisation ID") @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.getOrganisation(id, user)
        );
    }

    @Operation(
            summary = "Update organisation",
            description = "Fully replaces the organisation data. Requires the OWNER authority."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Organisation updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
            @ApiResponse(responseCode = "403", description = "Access denied (OWNER authority required)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Organisation not found", content = @Content)
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> update(
            @Parameter(description = "Organisation ID") @PathVariable UUID id,
            @RequestBody @Valid OrganisationRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.updateOrganisation(id, request, user)
        );
    }

    @Operation(
            summary = "Partially update organisation",
            description = "Updates only the provided fields of the organisation. Requires the OWNER authority."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Organisation updated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
            @ApiResponse(responseCode = "403", description = "Access denied (OWNER authority required)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Organisation not found", content = @Content)
    })
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Organisation> patch(
            @Parameter(description = "Organisation ID") @PathVariable UUID id,
            @RequestBody @Valid OrganisationPatchRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                organisationService.patchOrganisation(id, request, user)
        );
    }

    @Operation(
            summary = "Delete organisation",
            description = "Deletes the organisation with the given ID. Requires the OWNER authority."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Organisation deleted"),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
            @ApiResponse(responseCode = "403", description = "Access denied (OWNER authority required)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Organisation not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('OWNER')")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Organisation ID") @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal User user
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