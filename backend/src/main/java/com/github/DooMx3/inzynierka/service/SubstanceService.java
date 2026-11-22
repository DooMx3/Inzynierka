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
    return substanceRepository.findByOrganisationAndActiveTrue(
        getActiveOrganisationForReading(user));
  }

  @Transactional
  public Substance getById(UUID id, User user) {
    return getActiveSubstance(id, getActiveOrganisationForReading(user));
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
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner can manage substances");
    }
    return organisation;
  }

  private Organisation getActiveOrganisationForReading(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.WORKER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or worker can access substances");
    }
    return organisation;
  }

  private User getAuthenticatedUser(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    return userRepository
        .findById(user.getId())
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private Organisation getActiveOrganisation(User authenticatedUser) {
    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access substances of an inactive organisation");
    }
    return organisation;
  }
}
