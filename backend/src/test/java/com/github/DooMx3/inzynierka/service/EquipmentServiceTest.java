package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.equipment.EquipmentRequest;
import com.github.DooMx3.inzynierka.dto.equipment.EquipmentResponse;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.*;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
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
class EquipmentServiceTest {

  @Mock private EquipmentRepository equipmentRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private EquipmentService service;

  private User owner;
  private Organisation organisation;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    owner =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OWNER)))
            .build();
    lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
  }

  @Test
  void shouldCreateEquipmentForOrganisationOwner() {
    LocalDate inspectionDate = LocalDate.of(2027, 5, 1);
    EquipmentRequest request = new EquipmentRequest("  Fermentor  ", "  Winery  ", inspectionDate);
    when(equipmentRepository.save(any(Equipment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    EquipmentResponse result = service.create(request, owner);

    assertEquals("Fermentor", result.name());
    assertEquals("Winery", result.type());
    assertEquals(inspectionDate, result.endOfTechnicalInspection());
    assertTrue(result.active());
    verify(equipmentRepository)
        .save(
            argThat(
                equipment ->
                    equipment.getName().equals("Fermentor")
                        && equipment.getType().equals("Winery")
                        && equipment.getOrganisation() == organisation));
  }

  @Test
  void shouldReturnActiveEquipmentForOrganisationWorker() {
    User worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));
    when(equipmentRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation))
        .thenReturn(List.of(equipment(UUID.randomUUID(), true)));

    List<EquipmentResponse> result = service.getAll(worker);

    assertEquals(1, result.size());
    assertEquals("Barrel", result.getFirst().name());
  }

  @Test
  void shouldReturnActiveEquipmentForOrganisationOenologist() {
    User oenologist =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OENOLOGIST)))
            .build();
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));
    when(equipmentRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation))
        .thenReturn(List.of(equipment(UUID.randomUUID(), true)));

    List<EquipmentResponse> result = service.getAll(oenologist);

    assertEquals(1, result.size());
    assertEquals("Barrel", result.getFirst().name());
  }

  @Test
  void shouldGetEquipmentBelongingToOwnersOrganisation() {
    UUID id = UUID.randomUUID();
    Equipment equipment = equipment(id, true);
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(equipment));

    EquipmentResponse result = service.getById(id, owner);

    assertEquals(id, result.id());
    assertEquals("Barrel", result.name());
  }

  @Test
  void shouldUpdateEquipmentDetails() {
    UUID id = UUID.randomUUID();
    Equipment equipment = equipment(id, true);
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(equipment));
    when(equipmentRepository.save(equipment)).thenReturn(equipment);

    EquipmentResponse result =
        service.update(
            id, new EquipmentRequest("New name", "Vineyard", LocalDate.of(2028, 1, 1)), owner);

    assertEquals("New name", result.name());
    assertEquals("Vineyard", result.type());
    assertEquals(LocalDate.of(2028, 1, 1), result.endOfTechnicalInspection());
    verify(equipmentRepository).save(equipment);
  }

  @Test
  void shouldClearInspectionDateWhenUpdatingWithNull() {
    UUID id = UUID.randomUUID();
    Equipment equipment = equipment(id, true);
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(equipment));
    when(equipmentRepository.save(equipment)).thenReturn(equipment);

    EquipmentResponse result =
        service.update(id, new EquipmentRequest("Barrel", "Winery", null), owner);

    assertNull(result.endOfTechnicalInspection());
  }

  @Test
  void shouldDeactivateEquipmentWithoutDeletingIt() {
    UUID id = UUID.randomUUID();
    Equipment equipment = equipment(id, true);
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(equipment));

    service.delete(id, owner);

    assertFalse(equipment.isActive());
    assertEquals("Barrel", equipment.getName());
    verify(equipmentRepository).save(equipment);
  }

  @Test
  void shouldRejectEquipmentFromAnotherOrganisation() {
    UUID id = UUID.randomUUID();
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.getById(id, owner));
  }

  @Test
  void shouldRejectInactiveEquipment() {
    UUID id = UUID.randomUUID();
    when(equipmentRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(equipment(id, false)));

    assertThrows(InactiveResourceException.class, () -> service.getById(id, owner));
  }

  @Test
  void shouldRejectWorkerTryingToCreateEquipment() {
    User worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));

    assertThrows(
        InsufficientPermissionException.class,
        () -> service.create(new EquipmentRequest("Barrel", "Winery", null), worker));

    verifyNoInteractions(equipmentRepository);
  }

  @Test
  void shouldRejectUnauthenticatedUser() {
    assertThrows(UnauthorizedException.class, () -> service.getAll(null));

    verifyNoInteractions(equipmentRepository, userRepository);
  }

  private Equipment equipment(UUID id, boolean active) {
    Equipment equipment = new Equipment();
    equipment.setId(id);
    equipment.setOrganisation(organisation);
    equipment.setName("Barrel");
    equipment.setType("Winery");
    equipment.setEndOfTechnicalInspection(LocalDate.of(2027, 5, 1));
    equipment.setActive(active);
    return equipment;
  }
}
