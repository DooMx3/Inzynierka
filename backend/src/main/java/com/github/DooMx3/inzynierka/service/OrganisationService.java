package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganisationService {

    private final OrganisationRepository organisationRepository;

    @Transactional
    public Organisation createOrganisation(OrganisationRequest request) {
        Organisation organisation = Organisation.builder()
                .name(request.name())
                .taxId(request.taxId())
                .street(request.street())
                .postalCode(request.postalCode())
                .city(request.city())
                .logoPath(request.logoPath())
                .motto(request.motto())
                .build();

        return organisationRepository.save(organisation);
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