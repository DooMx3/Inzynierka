package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.dto.organisation.CreateOrganisationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.UpdateOrganisationRequest;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
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
    private final UserRepository userRepository;

    @Transactional
    public Organisation createOrganisation(CreateOrganisationRequest request, User user) {
        if (user == null) {
            throw new IllegalStateException("Authenticated user is required to create an organisation");
        }

        if (user.getOrganisationId() != null) {
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
        user.setOrganisationId(savedOrganisation.getId());
        user.setMembershipStatus(User.MembershipStatus.MEMBER);
        userRepository.save(user);

        return savedOrganisation;
    }

    @Transactional
    public Organisation getOrganisation(UUID id) {
        return organisationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organisation not found: " + id));
    }

    @Transactional
    public Organisation updateOrganisation(UUID id, UpdateOrganisationRequest request) {
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
