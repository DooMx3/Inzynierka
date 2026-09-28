package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;
    @GetMapping("/info")
    public ResponseEntity<User> getUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user);
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(@RequestBody @Valid ChangePasswordRequest request, @AuthenticationPrincipal User user) {
        service.changePassword(request, user.getEmail());
        return ResponseEntity.ok("Password changed successfully");
    }

    @PostMapping("/deactivate")
    public ResponseEntity<String> deactivateUser(@RequestBody @Valid DeactivateUserRequest request, @AuthenticationPrincipal User user) {
        service.deactivateUser(request, user.getEmail());
        return ResponseEntity.ok("User deactivated successfully");
    }
}
