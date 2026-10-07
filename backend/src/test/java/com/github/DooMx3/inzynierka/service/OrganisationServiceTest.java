package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.*;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.RoleRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrganisationServiceTest {

  @Mock private OrganisationRepository repository;

  @Mock private RoleRepository roleRepository;

  @Mock private UserRepository userRepository;

  @InjectMocks private OrganisationService service;

  @Nested
  class CreateOrganisation {

    @Test
    void shouldCreateOrganisation() {
      // arrange
      OrganisationRequest request =
          new OrganisationRequest(
              "Winnica Nad Wisłą",
              "1234567890",
              "ul. Winna 1",
              "20-001",
              "Lublin",
              null,
              "Tradycja");

      Organisation saved =
          Organisation.builder().name(request.name()).city(request.city()).active(true).build();

      when(repository.save(any(Organisation.class))).thenReturn(saved);

      Role ownerRole = ownerRole();
      when(roleRepository.findByName("OWNER")).thenReturn(Optional.of(ownerRole));

      User user = User.builder().build();

      // act
      Organisation result = service.createOrganisation(request, user);

      // assert
      assertEquals("Winnica Nad Wisłą", result.getName());
      assertEquals("Lublin", result.getCity());
      assertTrue(result.isActive());
      assertSame(saved, user.getOrganisation());
      assertEquals(MembershipStatus.MEMBER, user.getMembershipStatus());
      assertTrue(user.getRoles().contains(ownerRole));

      verify(repository).save(any(Organisation.class));
      verify(roleRepository).findByName("OWNER");
      verify(userRepository).save(user);
    }

    @Test
    void shouldRejectOrganisationCreationWithoutAuthenticatedUser() {
      // arrange
      OrganisationRequest request =
          new OrganisationRequest(
              "Winnica Nad Wisłą",
              "1234567890",
              "ul. Winna 1",
              "20-001",
              "Lublin",
              null,
              "Tradycja");

      // act & assert
      UnauthorizedException exception =
          assertThrows(
              UnauthorizedException.class, () -> service.createOrganisation(request, null));

      assertEquals(
          "Authenticated user is required to create an organisation", exception.getMessage());
      verifyNoInteractions(repository, roleRepository, userRepository);
    }

    @Test
    void shouldRejectOrganisationCreationForUserAlreadyAssignedToOrganisation() {
      // arrange
      Organisation existingOrganisation =
          Organisation.builder().id(UUID.randomUUID()).name("Istniejąca winnica").build();
      User user = User.builder().organisation(existingOrganisation).build();
      OrganisationRequest request =
          new OrganisationRequest(
              "Winnica Nad Wisłą",
              "1234567890",
              "ul. Winna 1",
              "20-001",
              "Lublin",
              null,
              "Tradycja");

      // act & assert
      OrganisationAlreadyAssignedException exception =
          assertThrows(
              OrganisationAlreadyAssignedException.class,
              () -> service.createOrganisation(request, user));

      assertEquals(
          "You cannot create another organisation because you already belong to one",
          exception.getMessage());
      verifyNoInteractions(repository, roleRepository, userRepository);
    }
  }

  @Nested
  class DeleteOrganisation {

    @Test
    void shouldDeactivateOrganisationWithoutChangingOtherFields() {
      // arrange
      UUID id = UUID.randomUUID();

      Organisation organisation =
          Organisation.builder()
              .id(id)
              .name("Winnica")
              .city("Lublin")
              .motto("Tradycja")
              .active(true)
              .build();
      Role ownerRole = ownerRole();
      User user =
          User.builder()
              .organisation(organisation)
              .membershipStatus(MembershipStatus.MEMBER)
              .roles(new HashSet<>(Set.of(ownerRole)))
              .build();
      User invitedUser =
          User.builder()
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();

      when(repository.findById(id)).thenReturn(Optional.of(organisation));
      when(userRepository.findByOrganisationAndMembershipStatus(
              organisation, MembershipStatus.PENDING))
          .thenReturn(List.of(invitedUser));

      // act
      service.deleteOrganisation(id, user);

      // assert
      assertFalse(organisation.isActive());
      assertEquals("Winnica", organisation.getName());
      assertEquals("Lublin", organisation.getCity());
      assertEquals("Tradycja", organisation.getMotto());
      assertNull(user.getOrganisation());
      assertEquals(MembershipStatus.NONE, user.getMembershipStatus());
      assertTrue(
          user.getRoles().stream().noneMatch(role -> RoleName.OWNER.name().equals(role.getName())));
      assertNull(invitedUser.getOrganisation());
      assertEquals(MembershipStatus.NONE, invitedUser.getMembershipStatus());

      verify(repository).findById(id);
      verify(userRepository)
          .findByOrganisationAndMembershipStatus(organisation, MembershipStatus.PENDING);
      verify(userRepository).saveAll(List.of(invitedUser));
      verify(userRepository).save(user);
    }
  }

  @Nested
  class PatchOrganisation {

    @Test
    void shouldUpdateOnlyProvidedPatchFields() {
      // arrange
      UUID id = UUID.randomUUID();

      Organisation organisation =
          Organisation.builder()
              .id(id)
              .name("Stara nazwa")
              .city("Lublin")
              .motto("Stare motto")
              .active(true)
              .build();
      Role ownerRole = ownerRole();
      User user =
          User.builder()
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(ownerRole)))
              .build();

      OrganisationPatchRequest request =
          new OrganisationPatchRequest(null, null, null, null, null, null, "Nowe motto");

      when(repository.findById(id)).thenReturn(Optional.of(organisation));
      when(repository.save(organisation)).thenReturn(organisation);

      // act
      Organisation result = service.patchOrganisation(id, request, user);

      // assert
      assertEquals("Stara nazwa", result.getName());
      assertEquals("Lublin", result.getCity());
      assertEquals("Nowe motto", result.getMotto());
    }
  }

  @Nested
  class OrganisationInvitation {
    @Test
    void shouldInviteUserToOrganisation() {
      // arrange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).active(true).build();
      Role ownerRole = ownerRole();
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(ownerRole)))
              .build();
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .email("worker@example.com")
              .membershipStatus(MembershipStatus.NONE)
              .build();

      when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));
      when(userRepository.findByEmail(invitedUser.getEmail())).thenReturn(Optional.of(invitedUser));

      // act
      service.inviteUser(
          organisationId, new OrganisationInvitationRequest(invitedUser.getEmail()), owner);

      // assert
      assertSame(organisation, invitedUser.getOrganisation());
      assertEquals(MembershipStatus.PENDING, invitedUser.getMembershipStatus());
      verify(userRepository).save(invitedUser);
    }

    @Test
    void shouldRejectInvitationWhenAccountDoesNotExist() {
      // arrange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).active(true).build();
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new HashSet<>(Set.of(ownerRole())))
              .build();
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest("missing@example.com");

      when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));
      when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

      // act & assert
      ResourceNotFoundException exception =
          assertThrows(
              ResourceNotFoundException.class,
              () -> service.inviteUser(organisationId, request, owner));

      assertEquals("No user exists with the provided email", exception.getMessage());
      verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldRejectRepeatedInvitation() {
      // arange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).active(true).build();
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new HashSet<>(Set.of(ownerRole())))
              .build();
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .email("worker@example.com")
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest(invitedUser.getEmail());

      when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));
      when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(invitedUser));

      // act & assert
      ResourceConflictException exception =
          assertThrows(
              ResourceConflictException.class,
              () -> service.inviteUser(organisationId, request, owner));

      assertEquals(
          "User already belongs to an organisation or has a pending invitation",
          exception.getMessage());
      assertEquals(MembershipStatus.PENDING, invitedUser.getMembershipStatus());
      assertSame(organisation, invitedUser.getOrganisation());
      verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldRejectInvitationWhenRequesterIsNotOrganisationOwner() {
      // arrange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).active(true).build();
      User requester =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .membershipStatus(MembershipStatus.MEMBER)
              .build();
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest("worker@example.com");

      when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));

      // act & assert
      assertThrows(
          InsufficientPermissionException.class,
          () -> service.inviteUser(organisationId, request, requester));

      verifyNoInteractions(userRepository);
    }

    @Test
    void shouldCancelPendingInvitation() {
      // arrange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).build();
      Role ownerRole = ownerRole();
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(ownerRole)))
              .build();
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .email("worker@example.com")
              .membershipStatus(MembershipStatus.PENDING)
              .build();

      when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));
      when(userRepository.findById(invitedUser.getId())).thenReturn(Optional.of(invitedUser));

      // act
      service.cancelInvitation(organisationId, invitedUser.getId(), owner);

      // assert
      assertEquals(MembershipStatus.NONE, invitedUser.getMembershipStatus());
      assertNull(invitedUser.getOrganisation());
      verify(userRepository).save(invitedUser);
    }
  }

  private static Role ownerRole() {
    Role role = new Role();
    role.setName(RoleName.OWNER.name());
    return role;
  }
}
