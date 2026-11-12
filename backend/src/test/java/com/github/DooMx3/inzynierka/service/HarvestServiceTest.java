package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.harvest.HarvestRequest;
import com.github.DooMx3.inzynierka.dto.harvest.HarvestResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HarvestServiceTest {

  @Mock private HarvestRepository harvestRepository;
  @Mock private FieldRepository fieldRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private HarvestService service;

  private User worker;
  private Organisation organisation;
  private Field field;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    field = field(true);
    lenient().when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));
  }

  @Test
  void shouldCreateHarvestForWorkersActiveField() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(harvestRepository.save(any(Harvest.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    HarvestResponse result = service.create(request(field.getId(), 125), worker);

    assertEquals(field.getId(), result.fieldId());
    assertEquals(GrapeVariety.SOLARIS, result.grapeVariety());
    assertEquals("Solaris", result.grapeVarietyName());
    assertEquals(125, result.amountKg());
    assertEquals(LocalDate.of(2026, 9, 20), result.harvestDate());
    assertTrue(result.active());
    verify(harvestRepository)
        .save(
            argThat(
                harvest ->
                    harvest.getOrganisation() == organisation
                        && harvest.getField() == field
                        && harvest.isActive()));
  }

  @Test
  void shouldReturnHarvestsFilteredByField() {
    Harvest harvest = harvest(field);
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(harvestRepository.findByOrganisationAndFieldIdAndActiveTrueOrderByHarvestDateDescIdAsc(
            organisation, field.getId()))
        .thenReturn(List.of(harvest));

    List<HarvestResponse> result = service.getAll(field.getId(), worker);

    assertEquals(1, result.size());
    assertEquals(harvest.getId(), result.get(0).id());
  }

  @Test
  void shouldUpdateHarvest() {
    UUID id = UUID.randomUUID();
    Harvest harvest = harvest(field);
    Field otherField = field(true);
    when(harvestRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(harvest));
    when(fieldRepository.findByIdAndOrganisation(otherField.getId(), organisation))
        .thenReturn(Optional.of(otherField));
    when(harvestRepository.save(harvest)).thenReturn(harvest);

    HarvestResponse result =
        service.update(
            id, new HarvestRequest(otherField.getId(), 240, LocalDate.of(2026, 9, 25)), worker);

    assertEquals(otherField.getId(), result.fieldId());
    assertEquals(240, result.amountKg());
    assertEquals(LocalDate.of(2026, 9, 25), result.harvestDate());
  }

  @Test
  void shouldSoftDeleteHarvest() {
    UUID id = UUID.randomUUID();
    Harvest harvest = harvest(field);
    when(harvestRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(harvest));

    service.delete(id, worker);

    assertFalse(harvest.isActive());
    verify(harvestRepository).save(harvest);
  }

  @Test
  void shouldRejectFieldOutsideOrganisation() {
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.empty());

    assertThrows(
        ResourceNotFoundException.class, () -> service.create(request(field.getId(), 10), worker));
    verify(harvestRepository, never()).save(any());
  }

  @Test
  void shouldRejectInactiveField() {
    field.setActive(false);
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));

    assertThrows(
        InactiveResourceException.class, () -> service.create(request(field.getId(), 10), worker));
    verify(harvestRepository, never()).save(any());
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
    verifyNoInteractions(harvestRepository);
  }

  private Field field(boolean active) {
    Field field = new Field();
    field.setId(UUID.randomUUID());
    field.setOrganisation(organisation);
    field.setGrapeVariety(GrapeVariety.SOLARIS);
    field.setGrapeColor(GrapeColor.WHITE);
    field.setAreaAre(new BigDecimal("10.00"));
    field.setActive(active);
    return field;
  }

  private HarvestRequest request(UUID fieldId, int amountKg) {
    return new HarvestRequest(fieldId, amountKg, LocalDate.of(2026, 9, 20));
  }

  private Harvest harvest(Field harvestField) {
    Harvest harvest = new Harvest();
    harvest.setId(UUID.randomUUID());
    harvest.setOrganisation(organisation);
    harvest.setField(harvestField);
    harvest.setAmountKg(125);
    harvest.setHarvestDate(LocalDate.of(2026, 9, 20));
    harvest.setActive(true);
    return harvest;
  }
}
