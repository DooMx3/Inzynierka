package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.dto.user.ResetPasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.UserPatchRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.PasswordResetToken;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.PasswordResetTokenRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;

  @Mock private PasswordResetTokenRepository passwordResetTokenRepository;

  @Mock private EmailService emailService;

  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private UserService service;

  private static final String OLD_PASSWORD = "oldPassword";
  private static final String NEW_PASSWORD = "newPassword";
  private static final String ENCODED_OLD_PASSWORD = "encodedOldPassword";
  private static final String ENCODED_NEW_PASSWORD = "encodedNewPassword";

  private static final String EMAIL = "example@example.com";
  private static final String NEW_EMAIL = "example2@example.com";

  private static final String PHONE_NUMBER = "123456789";
  private static final String NEW_PHONE_NUMBER = "987654321";

  @Nested
  class ChangePassword {

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
    void shouldThrowExceptionWhenUserNotFound() {
      // arrange
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

      // act & assert
      ChangePasswordRequest changePasswordRequest =
          new ChangePasswordRequest(NEW_EMAIL, NEW_PHONE_NUMBER);
      assertThrows(
          IllegalArgumentException.class,
          () -> service.changePassword(changePasswordRequest, EMAIL));
    }
  }

  @Nested
  class DeactivateUser {

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
    void shouldThrowExceptionWhenUserNotFound() {
      // arrange
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

      // act & assert
      DeactivateUserRequest deactivateUserRequest = new DeactivateUserRequest(OLD_PASSWORD);
      assertThrows(
          IllegalArgumentException.class,
          () -> service.deactivateUser(deactivateUserRequest, EMAIL));
    }
  }

  @Nested
  class PatchUser {

    @Test
    void shouldThrowExceptionWhenEmailIsAlreadyInUse() {
      // arrange
      User existingUser = new User();
      existingUser.setEmail(EMAIL);
      existingUser.setPhoneNumber(PHONE_NUMBER);
      User newUser = new User();
      newUser.setEmail(NEW_EMAIL);
      newUser.setPhoneNumber(NEW_PHONE_NUMBER);
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existingUser));
      when(userRepository.findByEmail(NEW_EMAIL)).thenReturn(Optional.of(newUser));

      // act
      UserPatchRequest request = new UserPatchRequest(NEW_EMAIL, NEW_PHONE_NUMBER);
      assertThrows(IllegalArgumentException.class, () -> service.patchUser(request, EMAIL));

      // assert
      verify(userRepository, never()).save(existingUser);
    }

    @Test
    void shouldPatchUserWhenEmailIsNotInUse() {
      // arrange
      User existingUser = new User();
      existingUser.setEmail(EMAIL);
      existingUser.setPhoneNumber(PHONE_NUMBER);
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existingUser));
      when(userRepository.findByEmail(NEW_EMAIL)).thenReturn(Optional.empty());

      // act
      UserPatchRequest request = new UserPatchRequest(NEW_EMAIL, NEW_PHONE_NUMBER);
      service.patchUser(request, EMAIL);

      // assert
      assertEquals(NEW_EMAIL, existingUser.getEmail());
      assertEquals(NEW_PHONE_NUMBER, existingUser.getPhoneNumber());
      verify(userRepository).save(existingUser);
    }

    @Test
    void shouldThrowExceptionWhenUserNotFound() {
      // arrange
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

      // act & assert
      UserPatchRequest userPatchRequest = new UserPatchRequest(NEW_EMAIL, NEW_PHONE_NUMBER);
      assertThrows(
          IllegalArgumentException.class, () -> service.patchUser(userPatchRequest, EMAIL));
    }
  }

  @Nested
  class sendPasswordResetEmail {
    @Test
    void shouldSendPasswordResetEmailWhenUserExists() {
      // arrange
      User user = new User();
      user.setEmail(EMAIL);
      when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

      // act
      service.sendPasswordResetEmail(EMAIL);

      // assert
      verify(userRepository).findByEmail(EMAIL);
      verify(emailService).sendPasswordResetEmail(eq(EMAIL), anyString());
      verify(passwordResetTokenRepository).save(any());
    }
  }

  @Nested
  class resetPassword {
    @Test
    void shouldThrowExceptionWhenTokenIsInvalid() {
      // arrange
      when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

      // act & assert
      assertThrows(
          IllegalArgumentException.class,
          () -> service.resetPassword(new ResetPasswordRequest("invalidToken", NEW_PASSWORD)));
    }

    @Test
    void shouldThrowExceptionWhenTokenIsAlreadyUsed() {
      // arrange
      PasswordResetToken token = new PasswordResetToken();
      token.setUsed(true);
      token.setExpiryDate(Instant.now().plusSeconds(3600));
      when(passwordResetTokenRepository.findByTokenHash(anyString()))
          .thenReturn(Optional.of(token));

      // act & assert
      assertThrows(
          IllegalArgumentException.class,
          () -> service.resetPassword(new ResetPasswordRequest("validToken", NEW_PASSWORD)));
    }

    @Test
    void shouldThrowExceptionWhenTokenIsExpired() {
      // arrange
      PasswordResetToken token = new PasswordResetToken();
      token.setUsed(false);
      token.setExpiryDate(Instant.now().minusSeconds(3600));
      when(passwordResetTokenRepository.findByTokenHash(anyString()))
          .thenReturn(Optional.of(token));

      // act & assert
      assertThrows(
          IllegalArgumentException.class,
          () -> service.resetPassword(new ResetPasswordRequest("validToken", NEW_PASSWORD)));
    }

    @Test
    void shouldResetPasswordWhenTokenIsValid() {
      // arrange
      User user = new User();
      PasswordResetToken token = new PasswordResetToken();
      token.setUsed(false);
      token.setExpiryDate(Instant.now().plusSeconds(3600));
      token.setUser(user);
      when(passwordResetTokenRepository.findByTokenHash(anyString()))
          .thenReturn(Optional.of(token));
      when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(ENCODED_NEW_PASSWORD);

      // act
      service.resetPassword(new ResetPasswordRequest("validToken", NEW_PASSWORD));

      // assert
      assertTrue(token.isUsed());
      assertEquals(ENCODED_NEW_PASSWORD, user.getPassword());
      verify(passwordResetTokenRepository).save(token);
      verify(userRepository).save(user);
    }
  }

  @Nested
  class UserInvitation {
    @Test
    void shouldAcceptPendingInvitation() {
      // arrange
      UUID userId = UUID.randomUUID();
      UUID organisationId = UUID.randomUUID();
      Organisation organisation =
          Organisation.builder().id(organisationId).name("Winnica").active(true).build();
      User user =
          User.builder()
              .id(userId)
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();
      when(userRepository.findById(userId)).thenReturn(Optional.of(user));

      // act
      service.acceptInvitation(organisationId, user);

      // assert
      assertEquals(MembershipStatus.MEMBER, user.getMembershipStatus());
      verify(userRepository).save(user);
    }

    @Test
    void shouldRejectPendingInvitation() {
      // arrange
      UUID userId = UUID.randomUUID();
      UUID organisationId = UUID.randomUUID();
      Organisation organisation = Organisation.builder().id(organisationId).build();
      User user =
          User.builder()
              .id(userId)
              .organisation(organisation)
              .membershipStatus(MembershipStatus.PENDING)
              .build();
      when(userRepository.findById(userId)).thenReturn(Optional.of(user));

      // act
      service.rejectInvitation(organisationId, user);

      // assert
      assertNull(user.getOrganisation());
      assertEquals(MembershipStatus.NONE, user.getMembershipStatus());
      verify(userRepository).save(user);
    }
  }
}
