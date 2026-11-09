package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.equipment.EquipmentRequest;
import com.github.DooMx3.inzynierka.dto.equipment.EquipmentResponse;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EquipmentService {

  private final EquipmentRepository equipmentRepository;
  private final UserRepository userRepository;

  @Transactional
  public EquipmentResponse create(EquipmentRequest request, User user) {
    Equipment equipment = new Equipment();
    equipment.setOrganisation(getActiveOwnedOrganisation(user));
    applyRequest(equipment, request);
    return EquipmentResponse.from(equipmentRepository.save(equipment));
  }

  @Transactional
  public List<EquipmentResponse> getAll(User user) {
    return equipmentRepository
        .findByOrganisationAndActiveTrueOrderByIdAsc(getActiveOrganisationForReading(user))
        .stream()
        .map(EquipmentResponse::from)
        .toList();
  }

  @Transactional
  public EquipmentResponse getById(UUID id, User user) {
    return EquipmentResponse.from(getActiveEquipment(id, getActiveOrganisationForReading(user)));
  }

  @Transactional
  public EquipmentResponse update(UUID id, EquipmentRequest request, User user) {
    Equipment equipment = getActiveEquipment(id, getActiveOwnedOrganisation(user));
    applyRequest(equipment, request);
    return EquipmentResponse.from(equipmentRepository.save(equipment));
  }

  @Transactional
  public void delete(UUID id, User user) {
    Equipment equipment = getActiveEquipment(id, getActiveOwnedOrganisation(user));
    equipment.setActive(false);
    equipmentRepository.save(equipment);
  }

  private void applyRequest(Equipment equipment, EquipmentRequest request) {
    equipment.setName(request.name().trim());
    equipment.setType(request.type().trim());
    equipment.setEndOfTechnicalInspection(request.endOfTechnicalInspection());
  }

  private Equipment getActiveEquipment(UUID id, Organisation organisation) {
    Equipment equipment =
        equipmentRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
    if (!equipment.isActive()) {
      throw new InactiveResourceException("Cannot access inactive equipment");
    }
    return equipment;
  }

  private Organisation getActiveOwnedOrganisation(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException("Only the organisation owner can manage equipment");
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
          "Only the organisation owner, worker or oenologist can access equipment");
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
      throw new InactiveResourceException("Cannot access equipment of an inactive organisation");
    }
    return organisation;
  }
}
