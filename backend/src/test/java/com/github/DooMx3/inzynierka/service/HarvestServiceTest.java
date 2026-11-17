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
    when(fieldRepository.findByIdInAndOrganisation(Set.of(field.getId()), organisation))
        .thenReturn(List.of(field));
    when(harvestRepository.save(any(Harvest.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    HarvestResponse result = service.create(request(field.getId(), 125), worker);

    assertEquals(1, result.fields().size());
    assertEquals(field.getId(), result.fields().get(0).id());
    assertEquals(GrapeVariety.SOLARIS, result.fields().get(0).grapeVariety());
    assertEquals("Solaris", result.fields().get(0).grapeVarietyName());
    assertEquals(125, result.amountKg());
    assertEquals(LocalDate.of(2026, 9, 20), result.harvestDate());
    assertTrue(result.active());
    verify(harvestRepository)
        .save(
            argThat(
                harvest ->
                    harvest.getOrganisation() == organisation
                        && harvest.getFields().equals(List.of(field))
                        && harvest.isActive()));
  }

  @Test
  void shouldCreateHarvestForMultipleFields() {
    Field otherField = field(true);
    when(fieldRepository.findByIdInAndOrganisation(
            Set.of(field.getId(), otherField.getId()), organisation))
        .thenReturn(List.of(otherField, field));
    when(harvestRepository.save(any(Harvest.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    HarvestResponse result =
        service.create(request(Set.of(field.getId(), otherField.getId()), 125), worker);

    assertEquals(
        List.of(field.getId(), otherField.getId()).stream().sorted().toList(),
        result.fields().stream().map(fieldResponse -> fieldResponse.id()).toList());
  }

  @Test
  void shouldReturnHarvestsFilteredByField() {
    Harvest harvest = harvest(field);
    when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    when(harvestRepository
            .findDistinctByOrganisationAndFields_IdAndActiveTrueOrderByHarvestDateDescIdAsc(
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
    when(fieldRepository.findByIdInAndOrganisation(Set.of(otherField.getId()), organisation))
        .thenReturn(List.of(otherField));
    when(harvestRepository.save(harvest)).thenReturn(harvest);

    HarvestResponse result =
        service.update(
            id,
            new HarvestRequest(Set.of(otherField.getId()), 240, LocalDate.of(2026, 9, 25)),
            worker);

    assertEquals(otherField.getId(), result.fields().get(0).id());
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
    when(fieldRepository.findByIdInAndOrganisation(Set.of(field.getId()), organisation))
        .thenReturn(List.of());

    assertThrows(
        ResourceNotFoundException.class, () -> service.create(request(field.getId(), 10), worker));
    verify(harvestRepository, never()).save(any());
  }

  @Test
  void shouldRejectInactiveField() {
    field.setActive(false);
    when(fieldRepository.findByIdInAndOrganisation(Set.of(field.getId()), organisation))
        .thenReturn(List.of(field));

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
    return request(Set.of(fieldId), amountKg);
  }

  private HarvestRequest request(Set<UUID> fieldIds, int amountKg) {
    return new HarvestRequest(fieldIds, amountKg, LocalDate.of(2026, 9, 20));
  }

  private Harvest harvest(Field harvestField) {
    Harvest harvest = new Harvest();
    harvest.setId(UUID.randomUUID());
    harvest.setOrganisation(organisation);
    harvest.setFields(List.of(harvestField));
    harvest.setAmountKg(125);
    harvest.setHarvestDate(LocalDate.of(2026, 9, 20));
    harvest.setActive(true);
    return harvest;
  }
}
