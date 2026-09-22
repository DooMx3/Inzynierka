package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.OrganisationAlreadyAssignedException;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.RoleRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganisationService {

    private final OrganisationRepository organisationRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Transactional
    public Organisation createOrganisation(OrganisationRequest request, User user) {
        if (user == null) {
            throw new IllegalStateException("Authenticated user is required to create an organisation");
        }

        if (user.getOrganisation() != null) {
            throw new OrganisationAlreadyAssignedException(
                    "You cannot create another organisation because you already belong to one"
            );
        }

        Organisation organisation = Organisation.builder()
                .name(request.name())
                .taxId(request.taxId())
                .street(request.street())
                .postalCode(request.postalCode())
                .city(request.city())
                .logoPath(request.logoPath())
                .motto(request.motto())
                .build();

        Organisation savedOrganisation = organisationRepository.save(organisation);
        user.setOrganisation(savedOrganisation);
        user.setMembershipStatus(MembershipStatus.MEMBER);
        Role ownerRole = roleRepository.findByName(RoleName.OWNER.name())
                .orElseThrow(() -> new IllegalStateException("OWNER role is not configured"));
        user.getRoles().add(ownerRole);
        userRepository.save(user);

        return savedOrganisation;
    }

    @Transactional
    public Organisation getOrganisation(UUID id, User user) {
        Organisation organisation = findOrganisation(id);
        requireOwner(organisation, user);
        return organisation;
    }

    @Transactional
    public Organisation updateOrganisation(UUID id, OrganisationRequest request, User user) {
        Organisation organisation = getOrganisation(id, user);

        if (!organisation.isActive()) {
            throw new IllegalStateException("Cannot update an inactive organisation");
        }

        organisation.setName(request.name());
        organisation.setTaxId(request.taxId());
        organisation.setStreet(request.street());
        organisation.setPostalCode(request.postalCode());
        organisation.setCity(request.city());
        organisation.setLogoPath(request.logoPath());
        organisation.setMotto(request.motto());

        return organisationRepository.save(organisation);
    }

    @Transactional
    public void deleteOrganisation(UUID id, User user) {
        Organisation organisation = getOrganisation(id, user);

        organisation.setActive(false);
        user.setOrganisation(null);
        user.setMembershipStatus(MembershipStatus.NONE);
        user.getRoles().removeIf(role -> RoleName.OWNER.name().equals(role.getName()));
        userRepository.save(user);
    }

    @Transactional
    public Organisation patchOrganisation(
            UUID id,
            @Valid OrganisationPatchRequest request,
            User user
    ) {
        Organisation organisation = getOrganisation(id, user);

        if (!organisation.isActive()) {
            throw new IllegalStateException(
                    "Cannot update an inactive organisation"
            );
        }

        if (request.name() != null) {
            organisation.setName(request.name());
        }
        if (request.taxId() != null) {
            organisation.setTaxId(request.taxId());
        }
        if (request.street() != null) {
            organisation.setStreet(request.street());
        }
        if (request.postalCode() != null) {
            organisation.setPostalCode(request.postalCode());
        }
        if (request.city() != null) {
            organisation.setCity(request.city());
        }
        if (request.logoPath() != null) {
            organisation.setLogoPath(request.logoPath());
        }
        if (request.motto() != null) {
            organisation.setMotto(request.motto());
        }

        return organisationRepository.save(organisation);
    }

    @Transactional
    public void inviteUser(UUID organisationId, OrganisationInvitationRequest request, User owner) {
        Organisation organisation = getOrganisation(organisationId, owner);
        if (!organisation.isActive()) {
            throw new IllegalStateException("Cannot invite a user to an inactive organisation");
        }

        User invitedUser = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("No user exists with the provided email"));

        if (invitedUser.getId() != null && invitedUser.getId().equals(owner.getId())) {
            throw new IllegalArgumentException("You cannot invite yourself");
        }
        if (invitedUser.getOrganisation() != null
                || invitedUser.getMembershipStatus() != MembershipStatus.NONE) {
            throw new IllegalArgumentException("User already belongs to an organisation or has a pending invitation");
        }

        invitedUser.setOrganisation(organisation);
        invitedUser.setMembershipStatus(MembershipStatus.PENDING);
        userRepository.save(invitedUser);
    }

    private Organisation findOrganisation(UUID id) {
        return organisationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Organisation not found: " + id));
    }

    private void requireOwner(Organisation organisation, User user) {
        if (user == null) {
            throw new AccessDeniedException("Authenticated user is required");
        }

        boolean ownsOrganisation = user.getOrganisation() != null
                && organisation.getId().equals(user.getOrganisation().getId())
                && user.getRoles().stream()
                .anyMatch(role -> RoleName.OWNER.name().equals(role.getName()));

        if (!ownsOrganisation) {
            throw new AccessDeniedException("Only the organisation owner can access the organisation");
        }
    }
}