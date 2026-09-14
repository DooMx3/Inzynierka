package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.RoleRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    public Organisation getOrganisation(UUID id) {
        return organisationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organisation not found: " + id));
    }

    @Transactional
    public Organisation updateOrganisation(UUID id, OrganisationRequest request) {
        Organisation organisation = getOrganisation(id);

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
    public void deleteOrganisation(UUID id) {
        Organisation organisation = organisationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Organisation not found: " + id));

        organisation.setActive(false);
    }

    @Transactional
    public Organisation patchOrganisation(
            UUID id,
            @Valid OrganisationPatchRequest request
    ) {
        Organisation organisation = getOrganisation(id);

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
}