package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.substance.SubstancePatchRequest;
import com.github.DooMx3.inzynierka.dto.substance.SubstanceRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.*;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubstanceServiceTest {

  @Mock private SubstanceRepository substanceRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private SubstanceService service;

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
  void shouldCreateSubstanceForOrganisationOwner() {
    SubstanceRequest request = new SubstanceRequest("Cabernet");
    Substance saved = new Substance();
    saved.setName(request.name());
    when(substanceRepository.save(any(Substance.class))).thenReturn(saved);

    Substance result = service.create(request, owner);

    assertSame(saved, result);
    assertEquals("Cabernet", saved.getName());
    verify(substanceRepository)
        .save(
            argThat(
                substance ->
                    substance.getName().equals("Cabernet")
                        && substance.getOrganisation() == organisation));
  }

  @Test
  void shouldReturnActiveSubstancesForOwner() {
    List<Substance> substances = List.of(new Substance(), new Substance());
    when(substanceRepository.findByOrganisationAndActiveTrue(organisation)).thenReturn(substances);

    assertSame(substances, service.getAll(owner));

    verify(substanceRepository).findByOrganisationAndActiveTrue(organisation);
  }

  @Test
  void shouldGetActiveSubstanceBelongingToOwnersOrganisation() {
    UUID id = UUID.randomUUID();
    Substance substance = substance(id, true, "Merlot");
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance));

    assertSame(substance, service.getById(id, owner));
  }

  @Test
  void shouldUpdateSubstanceName() {
    UUID id = UUID.randomUUID();
    Substance substance = substance(id, true, "Old name");
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance));
    when(substanceRepository.save(substance)).thenReturn(substance);

    Substance result = service.update(id, new SubstanceRequest("New name"), owner);

    assertSame(substance, result);
    assertEquals("New name", substance.getName());
    verify(substanceRepository).save(substance);
  }

  @Test
  void shouldPatchSubstanceNameWhenProvided() {
    UUID id = UUID.randomUUID();
    Substance substance = substance(id, true, "Old name");
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance));
    when(substanceRepository.save(substance)).thenReturn(substance);

    service.patch(id, new SubstancePatchRequest("New name"), owner);

    assertEquals("New name", substance.getName());
    verify(substanceRepository).save(substance);
  }

  @Test
  void shouldPreserveNameWhenPatchNameIsNull() {
    UUID id = UUID.randomUUID();
    Substance substance = substance(id, true, "Existing");
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance));
    when(substanceRepository.save(substance)).thenReturn(substance);

    service.patch(id, new SubstancePatchRequest(null), owner);

    assertEquals("Existing", substance.getName());
    verify(substanceRepository).save(substance);
  }

  @Test
  void shouldDeactivateSubstanceWithoutDeletingIt() {
    UUID id = UUID.randomUUID();
    Substance substance = substance(id, true, "Merlot");
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance));

    service.delete(id, owner);

    assertFalse(substance.isActive());
    assertEquals("Merlot", substance.getName());
    verify(substanceRepository).save(substance);
  }

  @Test
  void shouldRejectMissingSubstance() {
    UUID id = UUID.randomUUID();
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.empty());

    ResourceNotFoundException exception =
        assertThrows(ResourceNotFoundException.class, () -> service.getById(id, owner));

    assertEquals("Substance not found", exception.getMessage());
  }

  @Test
  void shouldRejectInactiveSubstance() {
    UUID id = UUID.randomUUID();
    when(substanceRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.of(substance(id, false, "Merlot")));

    InactiveResourceException exception =
        assertThrows(InactiveResourceException.class, () -> service.getById(id, owner));

    assertEquals("Cannot access an inactive substance", exception.getMessage());
  }

  @Test
  void shouldRejectUnauthenticatedUser() {
    assertThrows(UnauthorizedException.class, () -> service.getAll(null));
    verifyNoInteractions(userRepository, substanceRepository);
  }

  @Test
  void shouldRejectUserWithoutId() {
    User user = User.builder().build();

    assertThrows(UnauthorizedException.class, () -> service.getAll(user));
    verifyNoInteractions(userRepository, substanceRepository);
  }

  @Test
  void shouldRejectUnknownUser() {
    User user = User.builder().id(UUID.randomUUID()).build();
    when(userRepository.findById(user.getId())).thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.getAll(user));
    verifyNoInteractions(substanceRepository);
  }

  @Test
  void shouldRejectUserWithoutOwnerRole() {
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

    assertThrows(InsufficientPermissionException.class, () -> service.getAll(user));
    verifyNoInteractions(substanceRepository);
  }

  @Test
  void shouldRejectUserWithoutOrganisation() {
    User user =
        User.builder().id(UUID.randomUUID()).roles(new HashSet<>(Set.of(RoleName.OWNER))).build();
    when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

    assertThrows(InsufficientPermissionException.class, () -> service.getAll(user));
    verifyNoInteractions(substanceRepository);
  }

  @Test
  void shouldRejectInactiveOrganisation() {
    Organisation inactive = Organisation.builder().id(UUID.randomUUID()).active(false).build();
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(inactive)
            .roles(new HashSet<>(Set.of(RoleName.OWNER)))
            .build();
    when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

    assertThrows(InactiveResourceException.class, () -> service.getAll(user));
    verifyNoInteractions(substanceRepository);
  }

  private Substance substance(UUID id, boolean active, String name) {
    Substance substance = new Substance();
    substance.setId(id);
    substance.setActive(active);
    substance.setName(name);
    substance.setOrganisation(organisation);
    return substance;
  }
}
