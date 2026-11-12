package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.harvest.HarvestRequest;
import com.github.DooMx3.inzynierka.dto.harvest.HarvestResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HarvestService {

  private final HarvestRepository harvestRepository;
  private final FieldRepository fieldRepository;
  private final UserRepository userRepository;

  @Transactional
  public HarvestResponse create(HarvestRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    Field field = getActiveField(request.fieldId(), organisation);
    Harvest harvest = new Harvest();
    harvest.setOrganisation(organisation);
    harvest.setField(field);
    applyRequest(harvest, request);
    return HarvestResponse.from(harvestRepository.save(harvest));
  }

  @Transactional
  public List<HarvestResponse> getAll(UUID fieldId, User user) {
    Organisation organisation = getActiveOrganisation(user);
    List<Harvest> harvests;
    if (fieldId == null) {
      harvests =
          harvestRepository.findByOrganisationAndActiveTrueOrderByHarvestDateDescIdAsc(
              organisation);
    } else {
      getActiveField(fieldId, organisation);
      harvests =
          harvestRepository.findByOrganisationAndFieldIdAndActiveTrueOrderByHarvestDateDescIdAsc(
              organisation, fieldId);
    }
    return harvests.stream().map(HarvestResponse::from).toList();
  }

  @Transactional
  public HarvestResponse getById(UUID id, User user) {
    return HarvestResponse.from(getActiveHarvest(id, getActiveOrganisation(user)));
  }

  @Transactional
  public HarvestResponse update(UUID id, HarvestRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    Harvest harvest = getActiveHarvest(id, organisation);
    harvest.setField(getActiveField(request.fieldId(), organisation));
    applyRequest(harvest, request);
    return HarvestResponse.from(harvestRepository.save(harvest));
  }

  @Transactional
  public void delete(UUID id, User user) {
    Harvest harvest = getActiveHarvest(id, getActiveOrganisation(user));
    harvest.setActive(false);
    harvestRepository.save(harvest);
  }

  private void applyRequest(Harvest harvest, HarvestRequest request) {
    harvest.setAmountKg(request.amountKg());
    harvest.setHarvestDate(request.harvestDate());
  }

  private Field getActiveField(UUID id, Organisation organisation) {
    Field field =
        fieldRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Field not found"));
    if (!field.isActive()) {
      throw new InactiveResourceException("Cannot record harvest for an inactive field");
    }
    return field;
  }

  private Harvest getActiveHarvest(UUID id, Organisation organisation) {
    Harvest harvest =
        harvestRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Harvest not found"));
    if (!harvest.isActive()) {
      throw new InactiveResourceException("Cannot access an inactive harvest");
    }
    return harvest;
  }

  private Organisation getActiveOrganisation(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }

    User authenticatedUser =
        userRepository
            .findById(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access harvests of an inactive organisation");
    }
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.WORKER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or worker can manage harvests");
    }
    return organisation;
  }
}
