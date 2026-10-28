package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationDeleteRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.PendingInvitationResponse;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.service.OrganisationService;
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

@Tag(name = "Organisations", description = "Management of organisations")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/organisations")
@RequiredArgsConstructor
public class OrganisationController {

  private final OrganisationService organisationService;

  @Operation(
      summary = "Create organisation",
      description = "Creates a new organisation for the authenticated user.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Organisation created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
  })
  @PostMapping
  public ResponseEntity<Organisation> create(
      @RequestBody @Valid OrganisationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(organisationService.createOrganisation(request, user));
  }

  @Operation(
      summary = "Get current user's organisation",
      description = "Returns the organisation belonging to the authenticated owner.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Organisation found"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied (OWNER authority and organisation membership required)",
        content = @Content)
  })
  @GetMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Organisation> get(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(organisationService.getOrganisation(user));
  }

  @Operation(
      summary = "Update organisation",
      description = "Fully replaces the organisation data. Requires the OWNER authority.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Organisation updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied (OWNER authority and organisation membership required)",
        content = @Content)
  })
  @PutMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Organisation> update(
      @RequestBody @Valid OrganisationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(organisationService.updateOrganisation(request, user));
  }

  @Operation(
      summary = "Partially update organisation",
      description =
          "Updates only the provided fields of the organisation. Requires the OWNER authority.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Organisation updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied (OWNER authority and organisation membership required)",
        content = @Content)
  })
  @PatchMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Organisation> patch(
      @RequestBody @Valid OrganisationPatchRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(organisationService.patchOrganisation(request, user));
  }

  @Operation(
      summary = "Delete organisation",
      description =
          "Deletes the authenticated owner's organisation after verifying the owner's password.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Organisation deleted"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(
        responseCode = "401",
        description = "Not authenticated or password is incorrect",
        content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied (OWNER authority and organisation membership required)",
        content = @Content)
  })
  @DeleteMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(
      @RequestBody @Valid OrganisationDeleteRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.deleteOrganisation(request.password(), user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Invite a user to the organisation",
      description =
          "Creates a pending invitation for an existing user identified by email. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Invitation created", content = @Content),
    @ApiResponse(
        responseCode = "400",
        description =
            "Invalid email, account not found, or user already belongs to a vineyard or has a pending invitation",
        content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content)
  })
  @PostMapping("/invitations")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> invite(
      @RequestBody @Valid OrganisationInvitationRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.inviteUser(request, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "List pending organisation invitations",
      description =
          "Returns the users with pending invitations for this organisation. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Pending invitations returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; the owner must belong to an organisation",
        content = @Content)
  })
  @GetMapping("/invitations")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<List<PendingInvitationResponse>> getPendingInvitations(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(organisationService.getPendingInvitations(user));
  }

  @Operation(
      summary = "Cancel an organisation invitation",
      description =
          "Cancels a pending invitation and clears the invited user's organisation membership. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Invitation cancelled", content = @Content),
    @ApiResponse(
        responseCode = "400",
        description = "User not found or no pending invitation exists for this organisation",
        content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content)
  })
  @DeleteMapping("/invitations/{userId}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> cancelInvitation(
      @Parameter(description = "ID of the invited user") @PathVariable UUID userId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.cancelInvitation(userId, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Remove user from organisation",
      description =
          "Removes a member from the authenticated owner's organisation. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "User removed", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description =
            "User not found or user does not belong to the authenticated owner's organisation",
        content = @Content),
    @ApiResponse(
        responseCode = "409",
        description = "Inactive organisation or user has not accepted the invitation",
        content = @Content)
  })
  @DeleteMapping("/users/{userId}")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> removeUserFromOrganisation(
      @Parameter(description = "ID of the user") @PathVariable UUID userId,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.removeUserFromOrganisation(userId, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Leave organisation",
      description =
          "Removes the authenticated user from their organisation. Organisation owners cannot leave.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Organisation left", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "404",
        description = "User does not belong to a vineyard",
        content = @Content),
    @ApiResponse(
        responseCode = "409",
        description =
            "Inactive organisation, pending invitation, or authenticated user is the organisation owner",
        content = @Content)
  })
  @DeleteMapping("/leave")
  public ResponseEntity<Void> leave(@Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.leaveOrganisation(user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Add role to user in organisation",
      description =
          "Adds a role to a member of the organisation. The OWNER role cannot be assigned. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Role added", content = @Content),
    @ApiResponse(responseCode = "400", description = "Unknown role name", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description =
            "User not found or user does not belong to the authenticated owner's organisation",
        content = @Content),
    @ApiResponse(
        responseCode = "409",
        description =
            "OWNER role requested, inactive organisation, or user has a pending invitation",
        content = @Content)
  })
  @PostMapping("/users/{userId}/roles")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> addRoleToUser(
      @Parameter(description = "ID of the user") @PathVariable UUID userId,
      @Parameter(description = "Role to add") @RequestParam RoleName role,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.addRoleToUser(userId, role, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Remove role from user in organisation",
      description =
          "Removes a role from a member of the organisation. The OWNER role cannot be removed. Requires the OWNER authority for this organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Role removed", content = @Content),
    @ApiResponse(responseCode = "400", description = "Unknown role name", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content),
    @ApiResponse(
        responseCode = "404",
        description =
            "User not found or user does not belong to the authenticated owner's organisation",
        content = @Content),
    @ApiResponse(
        responseCode = "409",
        description =
            "OWNER role requested, inactive organisation, or user has a pending invitation",
        content = @Content)
  })
  @DeleteMapping("/users/{userId}/roles")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> removeRoleFromUser(
      @Parameter(description = "ID of the user") @PathVariable UUID userId,
      @Parameter(description = "Role to remove") @RequestParam RoleName role,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    organisationService.removeRoleFromUser(userId, role, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Get organisation members",
      description = "Retrieves members belonging to the authenticated owner's organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Organisation members retrieved successfully"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Access denied; organisation OWNER authority required",
        content = @Content),
    @ApiResponse(responseCode = "409", description = "Inactive organisation", content = @Content)
  })
  @GetMapping("/members")
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<List<User>> getOrganisationMembers(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    List<User> members = organisationService.getOrganisationMembers(user);
    return ResponseEntity.ok(members);
  }
}
