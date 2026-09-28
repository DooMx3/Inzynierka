package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService service;

    private static final String OLD_PASSWORD = "oldPassword";
    private static final String NEW_PASSWORD = "newPassword";
    private static final String ENCODED_OLD_PASSWORD = "encodedOldPassword";
    private static final String ENCODED_NEW_PASSWORD = "encodedNewPassword";

    private static final String EMAIL = "example@example.com";

    @Test
    void shouldThrowExceptionWhenOldPasswordDoesNotMatch() {
        // arrange
        ChangePasswordRequest request = new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD);
        User user = new User();
        user.setPassword(ENCODED_OLD_PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(OLD_PASSWORD, ENCODED_OLD_PASSWORD)).thenReturn(false);

        // assert
        assertThrows(IllegalArgumentException.class, () -> service.changePassword(request, EMAIL));
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldChangePasswordWhenOldPasswordMatches() {
        // arrange
        ChangePasswordRequest request = new ChangePasswordRequest(OLD_PASSWORD, NEW_PASSWORD);
        User user = new User();
        user.setPassword(ENCODED_OLD_PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(OLD_PASSWORD, ENCODED_OLD_PASSWORD)).thenReturn(true);
        when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_NEW_PASSWORD);

        // act
        service.changePassword(request, EMAIL);

        // assert
        assertEquals(ENCODED_NEW_PASSWORD, user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void shouldDeactivateUserWhenPasswordMatches() {
        // arrange
        User user = new User();
        user.setPassword(ENCODED_OLD_PASSWORD);
        user.setActive(true);
        DeactivateUserRequest request = new DeactivateUserRequest(OLD_PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(OLD_PASSWORD, ENCODED_OLD_PASSWORD)).thenReturn(true);

        // act
        service.deactivateUser(request, EMAIL);

        // assert
        assertFalse(user.isActive());
        verify(userRepository).save(user);
    }

    @Test
    void shouldThrowExceptionWhenDeactivatePasswordDoesNotMatch() {
        // arrange
        User user = new User();
        user.setPassword(ENCODED_OLD_PASSWORD);
        user.setActive(true);
        DeactivateUserRequest request = new DeactivateUserRequest(OLD_PASSWORD);

        // act
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(OLD_PASSWORD, ENCODED_OLD_PASSWORD)).thenReturn(false);

        // assert
        assertThrows(IllegalArgumentException.class, () -> service.deactivateUser(request, EMAIL));
        assertTrue(user.isActive());
        verify(userRepository, never()).save(user);
    }

    @Test
    void shouldAcceptPendingInvitation() {
        UUID userId = UUID.randomUUID();
        UUID organisationId = UUID.randomUUID();
        Organisation organisation = Organisation.builder()
                .id(organisationId)
                .name("Winnica")
                .active(true)
                .build();
        User user = User.builder()
                .id(userId)
                .organisation(organisation)
                .membershipStatus(MembershipStatus.PENDING)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        service.acceptInvitation(organisationId, user);

        assertEquals(MembershipStatus.MEMBER, user.getMembershipStatus());
        verify(userRepository).save(user);
    }

    @Test
    void shouldRejectPendingInvitation() {
        UUID userId = UUID.randomUUID();
        UUID organisationId = UUID.randomUUID();
        Organisation organisation = Organisation.builder()
                .id(organisationId)
                .build();
        User user = User.builder()
                .id(userId)
                .organisation(organisation)
                .membershipStatus(MembershipStatus.PENDING)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        service.rejectInvitation(organisationId, user);

        assertNull(user.getOrganisation());
        assertEquals(MembershipStatus.NONE, user.getMembershipStatus());
        verify(userRepository).save(user);
    }
}