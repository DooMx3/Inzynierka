package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.dto.user.ResetPasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.UserInvitationResponse;
import com.github.DooMx3.inzynierka.dto.user.UserPatchRequest;
import com.github.DooMx3.inzynierka.entities.PasswordResetToken;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.PasswordResetTokenRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final EmailService emailService;

  private static final int EXPIRATION_MINUTES = 15;

  @Value("${app.reset-password.url}")
  private String resetPasswordBaseUrl;

  public void changePassword(ChangePasswordRequest request, String email) {
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("There is no such user"));
    if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
      throw new IllegalArgumentException("Old password is incorrect");
    }
    user.setPassword(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);
  }

  public void deactivateUser(DeactivateUserRequest request, String email) {
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("There is no such user"));
    if (!passwordEncoder.matches(request.password(), user.getPassword())) {
      throw new IllegalArgumentException("Password is incorrect");
    }
    user.setActive(false);
    userRepository.save(user);
  }

  public void patchUser(UserPatchRequest request, String email) {
    User existingUser =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("There is no such user"));
    if (request.email() != null) {
      Optional<User> byEmail = userRepository.findByEmail(request.email());
      if (byEmail.isPresent()) {
        throw new IllegalArgumentException("Email is already in use");
      }
      existingUser.setEmail(request.email());
    }
    if (request.phoneNumber() != null) {
      existingUser.setPhoneNumber(request.phoneNumber());
    }
    userRepository.save(existingUser);
  }

  public void sendPasswordResetEmail(String email) {
    userRepository
        .findByEmail(email)
        .ifPresent(
            user -> {
              PasswordResetToken token = new PasswordResetToken();
              token.setUser(user);
              String rawToken = UUID.randomUUID().toString();
              token.setTokenHash(DigestUtils.sha256Hex(rawToken));
              token.setExpiryDate(Instant.now().plus(EXPIRATION_MINUTES, ChronoUnit.MINUTES));
              passwordResetTokenRepository.save(token);

              String resetLink = resetPasswordBaseUrl + "?token=" + rawToken;
              emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
            });
  }

  @Transactional
  public void resetPassword(ResetPasswordRequest request) {
    PasswordResetToken token =
        passwordResetTokenRepository
            .findByTokenHash(DigestUtils.sha256Hex(request.token()))
            .orElseThrow(() -> new IllegalArgumentException("Invalid token"));
    if (token.isExpired()) {
      throw new IllegalArgumentException("Token is expired");
    }
    if (token.isUsed()) {
      throw new IllegalArgumentException("Token is already used");
    }
    token.setUsed(true);
    passwordResetTokenRepository.save(token);
    User user = token.getUser();
    user.setPassword(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);
  }

  @Transactional
  public List<UserInvitationResponse> getInvitations(User authenticatedUser) {
    User user = loadAuthenticatedUser(authenticatedUser);
    if (user.getMembershipStatus() != MembershipStatus.PENDING || user.getOrganisation() == null) {
      return List.of();
    }

    return List.of(
        new UserInvitationResponse(
            user.getOrganisation().getId(), user.getOrganisation().getName()));
  }

  @Transactional
  public void acceptInvitation(UUID organisationId, User authenticatedUser) {
    User user = requirePendingInvitation(authenticatedUser, organisationId);
    if (!user.getOrganisation().isActive()) {
      throw new IllegalArgumentException("The organisation is inactive");
    }

    user.setMembershipStatus(MembershipStatus.MEMBER);
    userRepository.save(user);
  }

  @Transactional
  public void rejectInvitation(UUID organisationId, User authenticatedUser) {
    User user = requirePendingInvitation(authenticatedUser, organisationId);
    user.setOrganisation(null);
    user.setMembershipStatus(MembershipStatus.NONE);
    userRepository.save(user);
  }

  private User loadAuthenticatedUser(User authenticatedUser) {
    if (authenticatedUser == null || authenticatedUser.getId() == null) {
      throw new IllegalStateException("Authenticated user is required");
    }
    return userRepository
        .findById(authenticatedUser.getId())
        .orElseThrow(() -> new IllegalArgumentException("User not found"));
  }

  private User requirePendingInvitation(User authenticatedUser, UUID organisationId) {
    User user = loadAuthenticatedUser(authenticatedUser);
    if (user.getMembershipStatus() != MembershipStatus.PENDING
        || user.getOrganisation() == null
        || !organisationId.equals(user.getOrganisation().getId())) {
      throw new IllegalArgumentException("Pending invitation not found");
    }
    return user;
  }
}
