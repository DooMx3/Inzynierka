package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.spraying.SprayingRequest;
import com.github.DooMx3.inzynierka.dto.spraying.SprayingResponse;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Spraying;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.SprayingRepository;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SprayingService {

  private final SprayingRepository sprayingRepository;
  private final FieldRepository fieldRepository;
  private final EquipmentRepository equipmentRepository;
  private final SubstanceRepository substanceRepository;
  private final UserRepository userRepository;

  @Transactional
  public SprayingResponse create(SprayingRequest request, User user) {
    Organisation organisation = getActiveOwnedOrganisation(user);
    Spraying spraying = new Spraying();
    applyRequest(spraying, request, organisation);
    return SprayingResponse.from(sprayingRepository.save(spraying));
  }

  @Transactional
  public List<SprayingResponse> getAll(User user) {
    Organisation organisation = getActiveOrganisationForReading(user);
    return sprayingRepository.findByFieldOrganisationOrderBySprayingDateDesc(organisation).stream()
        .map(SprayingResponse::from)
        .toList();
  }

  @Transactional
  public SprayingResponse getById(UUID id, User user) {
    return SprayingResponse.from(getSpraying(id, getActiveOrganisationForReading(user)));
  }

  @Transactional
  public SprayingResponse update(UUID id, SprayingRequest request, User user) {
    Organisation organisation = getActiveOwnedOrganisation(user);
    Spraying spraying = getSpraying(id, organisation);
    applyRequest(spraying, request, organisation);
    return SprayingResponse.from(sprayingRepository.save(spraying));
  }

  @Transactional
  public void delete(UUID id, User user) {
    Spraying spraying = getSpraying(id, getActiveOwnedOrganisation(user));
    sprayingRepository.delete(spraying);
  }

  private void applyRequest(Spraying spraying, SprayingRequest request, Organisation organisation) {
    spraying.setField(getActiveField(request.fieldId(), organisation));
    spraying.setEquipment(getActiveEquipment(request.equipmentId(), organisation));
    spraying.setSubstance(getActiveSubstance(request.substanceId(), organisation));
    spraying.setSprayingDate(request.sprayingDate());
    spraying.setQuantity(request.quantity());
    spraying.setDue(request.due());
  }

  private Spraying getSpraying(UUID id, Organisation organisation) {
    Spraying spraying =
        sprayingRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Spraying not found"));
    if (spraying.getField() == null
        || spraying.getField().getOrganisation() == null
        || !organisation.getId().equals(spraying.getField().getOrganisation().getId())) {
      throw new ResourceNotFoundException("Spraying not found");
    }
    return spraying;
  }

  private Field getActiveField(UUID id, Organisation organisation) {
    Field field =
        fieldRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Field not found"));
    if (!field.isActive()) {
      throw new InactiveResourceException("Cannot use an inactive field");
    }
    return field;
  }

  private Equipment getActiveEquipment(UUID id, Organisation organisation) {
    Equipment equipment =
        equipmentRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
    if (!equipment.isActive()) {
      throw new InactiveResourceException("Cannot use inactive equipment");
    }
    return equipment;
  }

  private Substance getActiveSubstance(UUID id, Organisation organisation) {
    Substance substance =
        substanceRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Substance not found"));
    if (!substance.isActive()) {
      throw new InactiveResourceException("Cannot use an inactive substance");
    }
    return substance;
  }

  private Organisation getActiveOwnedOrganisation(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException("Only the organisation owner can manage spraying");
    }
    return organisation;
  }

  private Organisation getActiveOrganisationForReading(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.WORKER)
        && !authenticatedUser.getRoles().contains(RoleName.OENOLOGIST)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner, worker or oenologist can access spraying");
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
      throw new InactiveResourceException("Cannot access spraying of an inactive organisation");
    }
    return organisation;
  }
}
