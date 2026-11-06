package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.field.FieldRequest;
import com.github.DooMx3.inzynierka.dto.field.FieldResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.InvalidFieldRequestException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FieldService {

  private final FieldRepository fieldRepository;
  private final UserRepository userRepository;

  @Transactional
  public FieldResponse create(FieldRequest request, User user) {
    Organisation organisation = getActiveOwnedOrganisation(user);
    Field field = new Field();
    field.setOrganisation(organisation);
    applyRequest(field, request);
    return FieldResponse.from(fieldRepository.save(field));
  }

  @Transactional
  public List<FieldResponse> getAll(User user) {
    return fieldRepository
        .findByOrganisationAndActiveTrueOrderByIdAsc(getActiveOrganisationForReading(user))
        .stream()
        .map(FieldResponse::from)
        .toList();
  }

  @Transactional
  public FieldResponse getById(UUID id, User user) {
    return FieldResponse.from(getActiveField(id, getActiveOrganisationForReading(user)));
  }

  @Transactional
  public FieldResponse update(UUID id, FieldRequest request, User user) {
    Field field = getActiveField(id, getActiveOwnedOrganisation(user));
    applyRequest(field, request);
    return FieldResponse.from(fieldRepository.save(field));
  }

  @Transactional
  public void delete(UUID id, User user) {
    Field field = getActiveField(id, getActiveOwnedOrganisation(user));
    field.setActive(false);
    fieldRepository.save(field);
  }

  private void applyRequest(Field field, FieldRequest request) {
    if (request.grapeVariety() == GrapeVariety.OTHER) {
      if (request.otherGrapeVariety() == null || request.otherGrapeVariety().isBlank()) {
        throw new InvalidFieldRequestException(
            "A custom grape variety name is required when grapeVariety is OTHER");
      }
      field.setOtherGrapeVariety(request.otherGrapeVariety().trim());
    } else {
      if (request.otherGrapeVariety() != null && !request.otherGrapeVariety().isBlank()) {
        throw new InvalidFieldRequestException(
            "A custom grape variety name can only be provided when grapeVariety is OTHER");
      }
      field.setOtherGrapeVariety(null);
    }

    field.setAreaAre(request.areaAre());
    field.setGrapeVariety(request.grapeVariety());
    field.setGrapeColor(request.grapeColor());
  }

  private Field getActiveField(UUID id, Organisation organisation) {
    Field field =
        fieldRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Field not found"));
    if (!field.isActive()) {
      throw new InactiveResourceException("Cannot access an inactive field");
    }
    return field;
  }

  private Organisation getActiveOwnedOrganisation(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException("Only the organisation owner can manage fields");
    }
    return organisation;
  }

  private Organisation getActiveOrganisationForReading(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.WORKER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or worker can access fields");
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
      throw new InactiveResourceException("Cannot access fields of an inactive organisation");
    }
    return organisation;
  }
}
