package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.dto.user.UserInvitationResponse;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void changePassword(ChangePasswordRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("There is no such user"));
        if(!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Old password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public void deactivateUser(DeactivateUserRequest request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("There is no such user"));
        if(!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("Password is incorrect");
        }
        user.setActive(false);
        userRepository.save(user);
    }

    public List<UserInvitationResponse> getInvitations(User authenticatedUser) {
        User user = loadAuthenticatedUser(authenticatedUser);
        if (user.getMembershipStatus() != MembershipStatus.PENDING
                || user.getOrganisation() == null) {
            return List.of();
        }

        return List.of(new UserInvitationResponse(
                user.getOrganisation().getId(),
                user.getOrganisation().getName()
        ));
    }

    public void acceptInvitation(UUID organisationId, User authenticatedUser) {
        User user = requirePendingInvitation(authenticatedUser, organisationId);
        if (!user.getOrganisation().isActive()) {
            throw new IllegalArgumentException("The organisation is inactive");
        }

        user.setMembershipStatus(MembershipStatus.MEMBER);
        userRepository.save(user);
    }

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
        return userRepository.findById(authenticatedUser.getId())
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
