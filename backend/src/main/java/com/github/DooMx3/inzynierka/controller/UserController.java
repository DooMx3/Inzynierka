package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.UserInvitationResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;
    @GetMapping("/info")
    public ResponseEntity<User> getUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user);
    }

    @PostMapping
    public ResponseEntity<String> changePassword(@RequestBody @Valid ChangePasswordRequest request, @AuthenticationPrincipal User user) {
        service.changePassword(request, user.getEmail());
        return ResponseEntity.ok("Password changed successfully");
    }

    @GetMapping("/invitations")
    public ResponseEntity<List<UserInvitationResponse>> getInvitations(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(service.getInvitations(user));
    }

    @PostMapping("/invitations/{organisationId}/accept")
    public ResponseEntity<Void> acceptInvitation(
            @PathVariable UUID organisationId,
            @AuthenticationPrincipal User user
    ) {
        service.acceptInvitation(organisationId, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/invitations/{organisationId}")
    public ResponseEntity<Void> rejectInvitation(
            @PathVariable UUID organisationId,
            @AuthenticationPrincipal User user
    ) {
        service.rejectInvitation(organisationId, user);
        return ResponseEntity.noContent().build();
    }
}
