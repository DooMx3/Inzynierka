package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganisationService {

    private static final String DELETED_NAME = "DELETED_ORGANISATION";
    private static final String DELETED_CITY = "DELETED";

    private final OrganisationRepository organisationRepository;

    @Transactional
    public void deleteOrganisation(UUID id) {
        Organisation organisation = organisationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organisation not found: " + id));

        if (!organisation.isActive()) {
            return;
        }

        organisation.setName(DELETED_NAME);
        organisation.setTaxId(null);
        organisation.setStreet(null);
        organisation.setPostalCode(null);
        organisation.setCity(DELETED_CITY);
        organisation.setLogoPath(null);
        organisation.setMotto(null);
        organisation.setActive(false);

        organisationRepository.save(organisation);
    }
}