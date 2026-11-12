package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.pest.PestObservationRequest;
import com.github.DooMx3.inzynierka.dto.pest.PestObservationResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.PestObservation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.PestObservationType;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.PestObservationRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PestObservationServiceTest {

  @Mock private PestObservationRepository pestObservationRepository;
  @Mock private FieldRepository fieldRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private PestObservationService service;

  private User owner;
  private Organisation organisation;
  private Field field;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    owner =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OWNER)))
            .build();
    field = new Field();
    field.setId(UUID.randomUUID());
    field.setOrganisation(organisation);
    field.setActive(true);
    lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
  }

  @Test
  void shouldCreateObservationForOwnersActiveField() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(pestObservationRepository.save(any(PestObservation.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    PestObservationResponse result = service.create(request(field.getId()), owner);

    assertEquals(field.getId(), result.fieldId());
    assertEquals(PestObservationType.DISEASE, result.type());
    assertEquals("Powdery mildew", result.name());
    assertEquals(LocalDate.of(2026, 6, 12), result.observedAt());
    assertEquals("White spots on leaves", result.description());
    assertTrue(result.active());
    verify(pestObservationRepository)
        .save(
            argThat(
                observation ->
                    observation.getOrganisation() == organisation
                        && observation.getField() == field
                        && observation.isActive()));
  }

  @Test
  void shouldReturnActiveObservationsForRequestedField() {
    PestObservation observation = observation(field);
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(pestObservationRepository
            .findByOrganisationAndFieldIdAndActiveTrueOrderByObservedAtDescIdAsc(
                organisation, field.getId()))
        .thenReturn(List.of(observation));

    List<PestObservationResponse> result = service.getAll(field.getId(), owner);

    assertEquals(1, result.size());
    assertEquals(observation.getId(), result.get(0).id());
  }

  @Test
  void shouldUpdateObservationAndAllowDescriptionToBeCleared() {
    UUID id = UUID.randomUUID();
    PestObservation observation = observation(field);
    when(pestObservationRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(observation));
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(pestObservationRepository.save(observation)).thenReturn(observation);

    PestObservationResponse result =
        service.update(
            id,
            new PestObservationRequest(
                field.getId(),
                PestObservationType.PEST,
                "  Grape berry moth  ",
                LocalDate.of(2026, 7, 1),
                " "),
            owner);

    assertEquals(PestObservationType.PEST, result.type());
    assertEquals("Grape berry moth", result.name());
    assertEquals(LocalDate.of(2026, 7, 1), result.observedAt());
    assertNull(result.description());
  }

  @Test
  void shouldSoftDeleteObservation() {
    UUID id = UUID.randomUUID();
    PestObservation observation = observation(field);
    when(pestObservationRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(observation));

    service.delete(id, owner);

    assertFalse(observation.isActive());
    verify(pestObservationRepository).save(observation);
  }

  @Test
  void shouldRejectFieldOutsideOrganisation() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.empty());

    assertThrows(
        ResourceNotFoundException.class, () -> service.create(request(field.getId()), owner));
    verify(pestObservationRepository, never()).save(any());
  }

  @Test
  void shouldRejectInactiveField() {
    field.setActive(false);
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));

    assertThrows(
        InactiveResourceException.class, () -> service.create(request(field.getId()), owner));
    verify(pestObservationRepository, never()).save(any());
  }

  @Test
  void shouldRejectOenologist() {
    User oenologist =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OENOLOGIST)))
            .build();
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));

    assertThrows(InsufficientPermissionException.class, () -> service.getAll(null, oenologist));
    verifyNoInteractions(pestObservationRepository);
  }

  private PestObservationRequest request(UUID fieldId) {
    return new PestObservationRequest(
        fieldId,
        PestObservationType.DISEASE,
        "  Powdery mildew  ",
        LocalDate.of(2026, 6, 12),
        "  White spots on leaves  ");
  }

  private PestObservation observation(Field observationField) {
    PestObservation observation = new PestObservation();
    observation.setId(UUID.randomUUID());
    observation.setOrganisation(organisation);
    observation.setField(observationField);
    observation.setType(PestObservationType.DISEASE);
    observation.setName("Powdery mildew");
    observation.setObservedAt(LocalDate.of(2026, 6, 12));
    observation.setDescription("White spots on leaves");
    observation.setActive(true);
    return observation;
  }
}
