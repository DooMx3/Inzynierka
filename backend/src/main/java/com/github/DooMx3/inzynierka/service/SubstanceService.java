package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.substance.SubstancePatchRequest;
import com.github.DooMx3.inzynierka.dto.substance.SubstanceRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SubstanceService {

  private final SubstanceRepository substanceRepository;
  private final UserRepository userRepository;

  @Transactional
  public Substance create(SubstanceRequest request, User user) {
    Organisation organisation = getActiveOwnedOrganisation(user);

    Substance substance = new Substance();
    substance.setName(request.name());
    substance.setOrganisation(organisation);
    return substanceRepository.save(substance);
  }

  @Transactional
  public List<Substance> getAll(User user) {
    return substanceRepository.findByOrganisationAndActiveTrue(getActiveOwnedOrganisation(user));
  }

  @Transactional
  public Substance getById(UUID id, User user) {
    return getActiveSubstance(id, getActiveOwnedOrganisation(user));
  }

  @Transactional
  public Substance update(UUID id, SubstanceRequest request, User user) {
    Substance substance = getActiveSubstance(id, getActiveOwnedOrganisation(user));
    substance.setName(request.name());
    return substanceRepository.save(substance);
  }

  @Transactional
  public Substance patch(UUID id, SubstancePatchRequest request, User user) {
    Substance substance = getActiveSubstance(id, getActiveOwnedOrganisation(user));
    if (request.name() != null) {
      substance.setName(request.name());
    }
    return substanceRepository.save(substance);
  }

  @Transactional
  public void delete(UUID id, User user) {
    Substance substance = getActiveSubstance(id, getActiveOwnedOrganisation(user));
    substance.setActive(false);
    substanceRepository.save(substance);
  }

  private Substance getActiveSubstance(UUID id, Organisation organisation) {
    Substance substance =
        substanceRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Substance not found"));
    if (!substance.isActive()) {
      throw new InactiveResourceException("Cannot access an inactive substance");
    }
    return substance;
  }

  private Organisation getActiveOwnedOrganisation(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    User authenticatedUser =
        userRepository
            .findById(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null || !authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner can access substances");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access substances of an inactive organisation");
    }
    return organisation;
  }
}
