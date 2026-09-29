package com.github.DooMx3.inzynierka.dto.organisation;

import com.github.DooMx3.inzynierka.entities.User;

import java.util.UUID;

public record PendingInvitationResponse(
        UUID userId,
        String email,
        String firstname,
        String lastname
) {
    public static PendingInvitationResponse from(User user) {
        return new PendingInvitationResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstname(),
                user.getLastname()
        );
    }
}
