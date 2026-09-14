package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationPatchRequest;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
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

        when(repository.findById(id))
                .thenReturn(Optional.of(organisation));

        service.deleteOrganisation(id);

        assertFalse(organisation.isActive());
        assertEquals("Winnica", organisation.getName());
        assertEquals("Lublin", organisation.getCity());
        assertEquals("Tradycja", organisation.getMotto());

        verify(repository).findById(id);
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

        User user = User.builder().build();

        Organisation result = service.createOrganisation(request, user);

        assertEquals("Winnica Nad Wisłą", result.getName());
        assertEquals("Lublin", result.getCity());
        assertTrue(result.isActive());
        assertSame(saved, user.getOrganisation());
        assertEquals(MembershipStatus.MEMBER, user.getMembershipStatus());

        verify(repository).save(any(Organisation.class));
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
        verifyNoInteractions(repository, userRepository);
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
        verifyNoInteractions(repository, userRepository);
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

        Organisation result = service.patchOrganisation(id, request);

        assertEquals("Stara nazwa", result.getName());
        assertEquals("Lublin", result.getCity());
        assertEquals("Nowe motto", result.getMotto());
    }
}