package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.pest.PestObservationRequest;
import com.github.DooMx3.inzynierka.dto.pest.PestObservationResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.PestObservation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.PestObservationRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PestObservationService {

  private final PestObservationRepository pestObservationRepository;
  private final FieldRepository fieldRepository;
  private final UserRepository userRepository;

  @Transactional
  public PestObservationResponse create(PestObservationRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    Field field = getActiveField(request.fieldId(), organisation);
    PestObservation observation = new PestObservation();
    observation.setOrganisation(organisation);
    observation.setField(field);
    applyRequest(observation, request);
    return PestObservationResponse.from(pestObservationRepository.save(observation));
  }

  @Transactional
  public List<PestObservationResponse> getAll(UUID fieldId, User user) {
    Organisation organisation = getActiveOrganisation(user);
    if (fieldId != null) {
      getActiveField(fieldId, organisation);
      return pestObservationRepository
          .findByOrganisationAndFieldIdAndActiveTrueOrderByObservedAtDescIdAsc(
              organisation, fieldId)
          .stream()
          .map(PestObservationResponse::from)
          .toList();
    }
    return pestObservationRepository
        .findByOrganisationAndActiveTrueOrderByObservedAtDescIdAsc(organisation)
        .stream()
        .map(PestObservationResponse::from)
        .toList();
  }

  @Transactional
  public PestObservationResponse getById(UUID id, User user) {
    return PestObservationResponse.from(getActiveObservation(id, getActiveOrganisation(user)));
  }

  @Transactional
  public PestObservationResponse update(UUID id, PestObservationRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    PestObservation observation = getActiveObservation(id, organisation);
    observation.setField(getActiveField(request.fieldId(), organisation));
    applyRequest(observation, request);
    return PestObservationResponse.from(pestObservationRepository.save(observation));
  }

  @Transactional
  public void delete(UUID id, User user) {
    PestObservation observation = getActiveObservation(id, getActiveOrganisation(user));
    observation.setActive(false);
    pestObservationRepository.save(observation);
  }

  private void applyRequest(PestObservation observation, PestObservationRequest request) {
    observation.setType(request.type());
    observation.setName(request.name().trim());
    observation.setObservedAt(request.observedAt());
    observation.setDescription(
        request.description() == null || request.description().isBlank()
            ? null
            : request.description().trim());
  }

  private Field getActiveField(UUID id, Organisation organisation) {
    Field field =
        fieldRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Field not found"));
    if (!field.isActive()) {
      throw new InactiveResourceException("Cannot access observations for an inactive field");
    }
    return field;
  }

  private PestObservation getActiveObservation(UUID id, Organisation organisation) {
    PestObservation observation =
        pestObservationRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Pest observation not found"));
    if (!observation.isActive()) {
      throw new InactiveResourceException("Cannot access an inactive pest observation");
    }
    return observation;
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
      throw new InactiveResourceException(
          "Cannot access pest observations of an inactive organisation");
    }
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.WORKER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or worker can manage pest observations");
    }
    return organisation;
  }
}
