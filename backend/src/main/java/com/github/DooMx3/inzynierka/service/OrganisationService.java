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

    private final OrganisationRepository organisationRepository;

    @Transactional
    public void deleteOrganisation(UUID id) {
        Organisation organisation = organisationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Organisation not found: " + id));

        organisation.setActive(false);
    }
}