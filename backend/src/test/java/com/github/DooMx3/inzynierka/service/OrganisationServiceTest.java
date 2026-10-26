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
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.*;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class OrganisationServiceTest {

  @Mock private OrganisationRepository repository;

  @Mock private UserRepository userRepository;

  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private OrganisationService service;

  private void mockAuthenticatedUser(User user) {
    when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
  }

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

      User user = User.builder().build();

      // act
      Organisation result = service.createOrganisation(request, user);

      // assert
      assertEquals("Winnica Nad Wisłą", result.getName());
      assertEquals("Lublin", result.getCity());
      assertTrue(result.isActive());
      assertSame(saved, user.getOrganisation());
      assertEquals(MembershipStatus.MEMBER, user.getMembershipStatus());
      assertTrue(user.getRoles().contains(RoleName.OWNER));

      verify(repository).save(any(Organisation.class));
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
      verifyNoInteractions(repository, userRepository);
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
      verifyNoInteractions(repository, userRepository);
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
      User user =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .membershipStatus(MembershipStatus.MEMBER)
              .password("stored-hash")
              .roles(new HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(user);
      User invitedUser =
          User.builder()
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();

      when(userRepository.findByOrganisationAndMembershipStatus(
              organisation, MembershipStatus.PENDING))
          .thenReturn(List.of(invitedUser));
      when(passwordEncoder.matches("correct-password", "stored-hash")).thenReturn(true);

      // act
      service.deleteOrganisation("correct-password", user);

      // assert
      assertFalse(organisation.isActive());
      assertEquals("Winnica", organisation.getName());
      assertEquals("Lublin", organisation.getCity());
      assertEquals("Tradycja", organisation.getMotto());
      assertNull(user.getOrganisation());
      assertEquals(MembershipStatus.NONE, user.getMembershipStatus());
      assertTrue(user.getRoles().stream().noneMatch(RoleName.OWNER::equals));
      assertNull(invitedUser.getOrganisation());
      assertEquals(MembershipStatus.NONE, invitedUser.getMembershipStatus());

      verify(passwordEncoder).matches("correct-password", "stored-hash");
      verify(userRepository)
          .findByOrganisationAndMembershipStatus(organisation, MembershipStatus.PENDING);
      verify(userRepository).saveAll(List.of(invitedUser));
      verify(userRepository).save(user);
    }

    @Test
    void shouldNotDeleteOrganisationWhenPasswordIsIncorrect() {
      UUID id = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(id).active(true).build();
      User user =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .membershipStatus(MembershipStatus.MEMBER)
              .password("stored-hash")
              .roles(new HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(user);
      when(passwordEncoder.matches("wrong-password", "stored-hash")).thenReturn(false);

      assertThrows(
          InvalidCredentialsException.class,
          () -> service.deleteOrganisation("wrong-password", user));

      assertTrue(organisation.isActive());
      assertSame(organisation, user.getOrganisation());
      verify(passwordEncoder).matches("wrong-password", "stored-hash");
      verify(userRepository, never()).findByOrganisationAndMembershipStatus(any(), any());
      verify(userRepository, never()).save(any());
      verify(userRepository, never()).saveAll(any());
    }

    @Test
    void shouldNotDeleteOrganisationWhenUserDoesNotOwnIt() {
      UUID id = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(id).active(true).build();
      User user =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .password("stored-hash")
              .build();
      mockAuthenticatedUser(user);

      assertThrows(
          InsufficientPermissionException.class,
          () -> service.deleteOrganisation("correct-password", user));

      assertTrue(organisation.isActive());
      verify(userRepository).findById(user.getId());
      verifyNoInteractions(passwordEncoder);
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
      User user =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(user);

      OrganisationPatchRequest request =
          new OrganisationPatchRequest(null, null, null, null, null, null, "Nowe motto");

      when(repository.save(organisation)).thenReturn(organisation);

      // act
      Organisation result = service.patchOrganisation(request, user);

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
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(owner);
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .email("worker@example.com")
              .membershipStatus(MembershipStatus.NONE)
              .build();

      when(userRepository.findByEmail(invitedUser.getEmail())).thenReturn(Optional.of(invitedUser));

      // act
      service.inviteUser(new OrganisationInvitationRequest(invitedUser.getEmail()), owner);

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
              .roles(new HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(owner);
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest("missing@example.com");

      when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

      // act & assert
      ResourceNotFoundException exception =
          assertThrows(ResourceNotFoundException.class, () -> service.inviteUser(request, owner));

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
              .roles(new HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(owner);
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .email("worker@example.com")
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest(invitedUser.getEmail());

      when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(invitedUser));

      // act & assert
      ResourceConflictException exception =
          assertThrows(ResourceConflictException.class, () -> service.inviteUser(request, owner));

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
      mockAuthenticatedUser(requester);
      OrganisationInvitationRequest request =
          new OrganisationInvitationRequest("worker@example.com");

      // act & assert
      assertThrows(
          InsufficientPermissionException.class, () -> service.inviteUser(request, requester));

      verify(userRepository).findById(requester.getId());
      verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void shouldCancelPendingInvitation() {
      // arrange
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).build();
      RoleName role = RoleName.OWNER;
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new java.util.HashSet<>(Set.of(role)))
              .build();
      mockAuthenticatedUser(owner);
      User invitedUser =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .email("worker@example.com")
              .membershipStatus(MembershipStatus.PENDING)
              .build();

      when(userRepository.findById(invitedUser.getId())).thenReturn(Optional.of(invitedUser));

      // act
      service.cancelInvitation(invitedUser.getId(), owner);

      // assert
      assertEquals(MembershipStatus.NONE, invitedUser.getMembershipStatus());
      assertNull(invitedUser.getOrganisation());
      verify(userRepository).save(invitedUser);
    }
  }

  @Nested
  class GetOrganisationMembers {

    @Test
    void shouldReturnMembersOfAuthenticatedOwnersOrganisation() {
      Organisation organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
      User owner =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(organisation)
              .roles(new HashSet<>(Set.of(RoleName.OWNER)))
              .build();
      mockAuthenticatedUser(owner);
      List<User> members =
          List.of(User.builder().membershipStatus(MembershipStatus.MEMBER).build());
      when(userRepository.findByOrganisationIdAndMembershipStatus(
              organisation.getId(), MembershipStatus.MEMBER))
          .thenReturn(members);

      assertSame(members, service.getOrganisationMembers(owner));
      verify(userRepository)
          .findByOrganisationIdAndMembershipStatus(organisation.getId(), MembershipStatus.MEMBER);
    }

    @Test
    void shouldRejectMemberListingWhenUserIsNotAnOwner() {
      User user =
          User.builder()
              .id(UUID.randomUUID())
              .organisation(Organisation.builder().id(UUID.randomUUID()).active(true).build())
              .roles(new HashSet<>())
              .build();
      mockAuthenticatedUser(user);

      assertThrows(
          InsufficientPermissionException.class, () -> service.getOrganisationMembers(user));

      verify(userRepository).findById(user.getId());
    }
  }
}
