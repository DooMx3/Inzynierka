package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationInvitationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.OrganisationAlreadyAssignedException;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.RoleRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganisationServiceTest {

    @Mock
    private OrganisationRepository repository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private OrganisationService service;

    @Test
    void shouldDeactivateOrganisationWithoutChangingOtherFields() {
        UUID id = UUID.randomUUID();

        Organisation organisation = Organisation.builder()
                .id(id)
                .name("Winnica")
                .city("Lublin")
                .motto("Tradycja")
                .active(true)
                .build();
        Role ownerRole = new Role();
        ownerRole.setName(RoleName.OWNER.name());
        User user = User.builder()
                .organisation(organisation)
                .membershipStatus(MembershipStatus.MEMBER)
                .roles(new java.util.HashSet<>(Set.of(ownerRole)))
                .build();

        when(repository.findById(id))
                .thenReturn(Optional.of(organisation));

        service.deleteOrganisation(id, user);

        assertFalse(organisation.isActive());
        assertEquals("Winnica", organisation.getName());
        assertEquals("Lublin", organisation.getCity());
        assertEquals("Tradycja", organisation.getMotto());
        assertNull(user.getOrganisation());
        assertEquals(MembershipStatus.NONE, user.getMembershipStatus());
        assertTrue(user.getRoles().stream()
                .noneMatch(role -> RoleName.OWNER.name().equals(role.getName())));

        verify(repository).findById(id);
        verify(userRepository).save(user);
    }


    @Test
    void shouldCreateOrganisation() {
        OrganisationRequest request = new OrganisationRequest(
                "Winnica Nad Wisłą",
                "1234567890",
                "ul. Winna 1",
                "20-001",
                "Lublin",
                null,
                "Tradycja"
        );

        Organisation saved = Organisation.builder()
                .name(request.name())
                .city(request.city())
                .active(true)
                .build();

        when(repository.save(any(Organisation.class)))
                .thenReturn(saved);

        Role ownerRole = new Role();
        ownerRole.setName("OWNER");
        when(roleRepository.findByName("OWNER"))
                .thenReturn(Optional.of(ownerRole));

        User user = User.builder().build();

        Organisation result = service.createOrganisation(request, user);

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
        OrganisationRequest request = new OrganisationRequest(
                "Winnica Nad Wisłą",
                "1234567890",
                "ul. Winna 1",
                "20-001",
                "Lublin",
                null,
                "Tradycja"
        );

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> service.createOrganisation(request, null)
        );

        assertEquals(
                "Authenticated user is required to create an organisation",
                exception.getMessage()
        );
        verifyNoInteractions(repository, roleRepository, userRepository);
    }

    @Test
    void shouldRejectOrganisationCreationForUserAlreadyAssignedToOrganisation() {
        Organisation existingOrganisation = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Istniejąca winnica")
                .build();
        User user = User.builder()
                .organisation(existingOrganisation)
                .build();
        OrganisationRequest request = new OrganisationRequest(
                "Winnica Nad Wisłą",
                "1234567890",
                "ul. Winna 1",
                "20-001",
                "Lublin",
                null,
                "Tradycja"
        );

        OrganisationAlreadyAssignedException exception = assertThrows(
                OrganisationAlreadyAssignedException.class,
                () -> service.createOrganisation(request, user)
        );

        assertEquals(
                "You cannot create another organisation because you already belong to one",
                exception.getMessage()
        );
        verifyNoInteractions(repository, roleRepository, userRepository);
    }

    @Test
    void shouldUpdateOnlyProvidedPatchFields() {
        UUID id = UUID.randomUUID();

        Organisation organisation = Organisation.builder()
                .id(id)
                .name("Stara nazwa")
                .city("Lublin")
                .motto("Stare motto")
                .active(true)
                .build();
        Role ownerRole = new Role();
        ownerRole.setName(RoleName.OWNER.name());
        User user = User.builder()
                .organisation(organisation)
                .roles(new java.util.HashSet<>(Set.of(ownerRole)))
                .build();

        OrganisationPatchRequest request = new OrganisationPatchRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                "Nowe motto"
        );

        when(repository.findById(id))
                .thenReturn(Optional.of(organisation));
        when(repository.save(organisation))
                .thenReturn(organisation);

        Organisation result = service.patchOrganisation(id, request, user);

        assertEquals("Stara nazwa", result.getName());
        assertEquals("Lublin", result.getCity());
        assertEquals("Nowe motto", result.getMotto());
    }

    @Test
    void shouldInviteUserToOrganisation() {
        UUID organisationId = UUID.randomUUID();
        Organisation organisation = Organisation.builder().id(organisationId).active(true).build();
        Role ownerRole = new Role();
        ownerRole.setName(RoleName.OWNER.name());
        User owner = User.builder()
                .id(UUID.randomUUID())
                .organisation(organisation)
                .roles(new java.util.HashSet<>(Set.of(ownerRole)))
                .build();
        User invitedUser = User.builder()
                .id(UUID.randomUUID())
                .email("worker@example.com")
                .membershipStatus(MembershipStatus.NONE)
                .build();

        when(repository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(userRepository.findByEmail(invitedUser.getEmail())).thenReturn(Optional.of(invitedUser));

        service.inviteUser(
                organisationId,
                new OrganisationInvitationRequest(invitedUser.getEmail()),
                owner
        );

        assertSame(organisation, invitedUser.getOrganisation());
        assertEquals(MembershipStatus.PENDING, invitedUser.getMembershipStatus());
        verify(userRepository).save(invitedUser);
    }
}