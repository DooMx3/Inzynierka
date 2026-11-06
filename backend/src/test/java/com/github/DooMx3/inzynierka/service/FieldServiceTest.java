package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.field.FieldRequest;
import com.github.DooMx3.inzynierka.dto.field.FieldResponse;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.InvalidFieldRequestException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FieldServiceTest {

  @Mock private FieldRepository fieldRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private FieldService service;

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
  void shouldCreateFieldForOwnersOrganisation() {
    FieldRequest request =
        new FieldRequest(
            new BigDecimal("10.50"), GrapeVariety.OTHER, "Local variety", GrapeColor.WHITE);
    when(fieldRepository.save(any(Field.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    FieldResponse result = service.create(request, owner);

    assertEquals(new BigDecimal("10.50"), result.areaAre());
    assertEquals(GrapeVariety.OTHER, result.grapeVariety());
    assertEquals("Local variety", result.grapeVarietyName());
    assertEquals(GrapeColor.WHITE, result.grapeColor());
    verify(fieldRepository)
        .save(
            argThat(
                field ->
                    field.getOrganisation() == organisation
                        && field.isActive()
                        && field.getOtherGrapeVariety().equals("Local variety")));
  }

  @Test
  void shouldReturnOnlyActiveFieldsForOwnersOrganisation() {
    Field field = field(new BigDecimal("5.00"), GrapeVariety.SOLARIS, null, true);
    when(fieldRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation))
        .thenReturn(List.of(field));

    List<FieldResponse> fields = service.getAll(owner);

    assertEquals(1, fields.size());
    assertEquals("Solaris", fields.get(0).grapeVarietyName());
    verify(fieldRepository).findByOrganisationAndActiveTrueOrderByIdAsc(organisation);
  }

  @Test
  void shouldAllowWorkersToReadFieldsForTheirOrganisation() {
    User worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));
    when(fieldRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation))
        .thenReturn(List.of());

    assertTrue(service.getAll(worker).isEmpty());

    verify(fieldRepository).findByOrganisationAndActiveTrueOrderByIdAsc(organisation);
  }

  @Test
  void shouldUpdateField() {
    UUID id = UUID.randomUUID();
    Field field = field(new BigDecimal("5.00"), GrapeVariety.SOLARIS, null, true);
    when(fieldRepository.findByIdAndOrganisation(id, organisation)).thenReturn(Optional.of(field));
    when(fieldRepository.save(field)).thenReturn(field);

    FieldResponse result =
        service.update(
            id,
            new FieldRequest(new BigDecimal("6.25"), GrapeVariety.REGENT, null, GrapeColor.RED),
            owner);

    assertEquals(new BigDecimal("6.25"), result.areaAre());
    assertEquals(GrapeVariety.REGENT, result.grapeVariety());
    assertEquals(GrapeColor.RED, result.grapeColor());
    assertNull(field.getOtherGrapeVariety());
  }

  @Test
  void shouldDeactivateFieldWithoutDeletingIt() {
    UUID id = UUID.randomUUID();
    Field field = field(new BigDecimal("5.00"), GrapeVariety.SOLARIS, null, true);
    when(fieldRepository.findByIdAndOrganisation(id, organisation)).thenReturn(Optional.of(field));

    service.delete(id, owner);

    assertFalse(field.isActive());
    verify(fieldRepository).save(field);
  }

  @Test
  void shouldRequireCustomNameForOtherVariety() {
    FieldRequest request =
        new FieldRequest(new BigDecimal("2.00"), GrapeVariety.OTHER, " ", GrapeColor.RED);

    assertThrows(InvalidFieldRequestException.class, () -> service.create(request, owner));
    verifyNoInteractions(fieldRepository);
  }

  @Test
  void shouldRejectFieldFromAnotherOrganisation() {
    UUID id = UUID.randomUUID();
    when(fieldRepository.findByIdAndOrganisation(id, organisation)).thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.getById(id, owner));
  }

  @Test
  void shouldRejectInactiveField() {
    UUID id = UUID.randomUUID();
    when(fieldRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(field(new BigDecimal("5.00"), GrapeVariety.SOLARIS, null, false)));

    assertThrows(InactiveResourceException.class, () -> service.getById(id, owner));
  }

  @Test
  void shouldRejectOenologistFromReadingFields() {
    User oenologist =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OENOLOGIST)))
            .build();
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));

    assertThrows(InsufficientPermissionException.class, () -> service.getAll(oenologist));
    verifyNoInteractions(fieldRepository);
  }

  private Field field(BigDecimal area, GrapeVariety variety, String otherVariety, boolean active) {
    Field field = new Field();
    field.setId(UUID.randomUUID());
    field.setOrganisation(organisation);
    field.setAreaAre(area);
    field.setGrapeVariety(variety);
    field.setOtherGrapeVariety(otherVariety);
    field.setGrapeColor(GrapeColor.WHITE);
    field.setActive(active);
    return field;
  }
}
