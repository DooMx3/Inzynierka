package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.spraying.SprayingRequest;
import com.github.DooMx3.inzynierka.dto.spraying.SprayingResponse;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Spraying;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.*;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.SprayingRepository;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SprayingServiceTest {

  @Mock private SprayingRepository sprayingRepository;
  @Mock private FieldRepository fieldRepository;
  @Mock private EquipmentRepository equipmentRepository;
  @Mock private SubstanceRepository substanceRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private SprayingService service;

  private Organisation organisation;
  private User owner;
  private Field field;
  private Equipment equipment;
  private Substance substance;
  private SprayingRequest request;

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
    equipment = new Equipment();
    equipment.setId(UUID.randomUUID());
    equipment.setOrganisation(organisation);
    equipment.setActive(true);
    substance = new Substance();
    substance.setId(UUID.randomUUID());
    substance.setOrganisation(organisation);
    substance.setActive(true);
    request =
        new SprayingRequest(
            field.getId(),
            equipment.getId(),
            substance.getId(),
            Instant.parse("2026-11-12T08:00:00Z"),
            25,
            Instant.parse("2026-11-19T08:00:00Z"));
    lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
  }

  @Test
  void shouldCreateSprayingForOwnersOrganisation() {
    stubActiveResources();
    when(sprayingRepository.save(any(Spraying.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    SprayingResponse result = service.create(request, owner);

    assertEquals(field.getId(), result.fieldId());
    assertEquals(equipment.getId(), result.equipmentId());
    assertEquals(substance.getId(), result.substanceId());
    assertEquals(25, result.quantity());
    verify(sprayingRepository).save(any(Spraying.class));
  }

  @Test
  void shouldListSprayingForOwnersOrganisation() {
    Spraying spraying = spraying(UUID.randomUUID());
    when(sprayingRepository.findByFieldOrganisationOrderBySprayingDateDesc(organisation))
        .thenReturn(List.of(spraying));

    List<SprayingResponse> result = service.getAll(owner);

    assertEquals(1, result.size());
    assertEquals(spraying.getId(), result.getFirst().id());
  }

  @Test
  void shouldUpdateSprayingDetails() {
    stubActiveResources();
    Spraying spraying = spraying(UUID.randomUUID());
    when(sprayingRepository.findById(spraying.getId())).thenReturn(Optional.of(spraying));
    when(sprayingRepository.save(spraying)).thenReturn(spraying);

    SprayingResponse result = service.update(spraying.getId(), request, owner);

    assertEquals(request.sprayingDate(), result.sprayingDate());
    assertEquals(request.due(), result.due());
    assertEquals(request.quantity(), result.quantity());
    verify(sprayingRepository).save(spraying);
  }

  @Test
  void shouldDeleteSpraying() {
    Spraying spraying = spraying(UUID.randomUUID());
    when(sprayingRepository.findById(spraying.getId())).thenReturn(Optional.of(spraying));

    service.delete(spraying.getId(), owner);

    verify(sprayingRepository).delete(spraying);
  }

  @Test
  void shouldRejectSprayingFromAnotherOrganisation() {
    Organisation otherOrganisation =
        Organisation.builder().id(UUID.randomUUID()).active(true).build();
    Field otherField = new Field();
    otherField.setId(UUID.randomUUID());
    otherField.setOrganisation(otherOrganisation);
    Spraying spraying = spraying(UUID.randomUUID());
    spraying.setField(otherField);
    when(sprayingRepository.findById(spraying.getId())).thenReturn(Optional.of(spraying));

    assertThrows(ResourceNotFoundException.class, () -> service.getById(spraying.getId(), owner));
  }

  @Test
  void shouldRejectInactiveRelatedResource() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    field.setActive(false);
    assertThrows(InactiveResourceException.class, () -> service.create(request, owner));
    verifyNoInteractions(sprayingRepository);
  }

  @Test
  void shouldRejectWorkerTryingToCreateSpraying() {
    User worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));

    assertThrows(InsufficientPermissionException.class, () -> service.create(request, worker));
    verifyNoInteractions(sprayingRepository);
  }

  @Test
  void shouldRejectUnauthenticatedUser() {
    assertThrows(UnauthorizedException.class, () -> service.getAll(null));
    verifyNoInteractions(sprayingRepository, userRepository);
  }

  private Spraying spraying(UUID id) {
    Spraying spraying = new Spraying();
    spraying.setId(id);
    spraying.setField(field);
    spraying.setEquipment(equipment);
    spraying.setSubstance(substance);
    spraying.setSprayingDate(request.sprayingDate());
    spraying.setQuantity(request.quantity());
    spraying.setDue(request.due());
    return spraying;
  }

  private void stubActiveResources() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(equipmentRepository.findByIdAndOrganisation(equipment.getId(), organisation))
        .thenReturn(Optional.of(equipment));
    when(substanceRepository.findByIdAndOrganisation(substance.getId(), organisation))
        .thenReturn(Optional.of(substance));
  }
}
