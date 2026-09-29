package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.user.ChangePasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.DeactivateUserRequest;
import com.github.DooMx3.inzynierka.dto.user.ForgotPasswordRequest;
import com.github.DooMx3.inzynierka.dto.user.ResetPasswordRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User", description = "Account management and password recovery")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    @Operation(summary = "Get current user", description = "Returns information about the authenticated user.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @GetMapping("/info")
    public ResponseEntity<User> getUser(@Parameter(hidden = true) @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(user);
    }

    @Operation(summary = "Change password", description = "Changes the password of the authenticated user.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password changed"),
            @ApiResponse(responseCode = "400", description = "Validation error or wrong current password", content = @Content),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(@RequestBody @Valid ChangePasswordRequest request, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        service.changePassword(request, user.getEmail());
        return ResponseEntity.ok("Password changed successfully");
    }

    @Operation(summary = "Deactivate account", description = "Deactivates the authenticated user's account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deactivated"),
            @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content)
    })
    @PostMapping("/deactivate")
    public ResponseEntity<String> deactivateUser(@RequestBody @Valid DeactivateUserRequest request, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        service.deactivateUser(request, user.getEmail());
        return ResponseEntity.ok("User deactivated successfully");
    }

    @Operation(summary = "Request password reset",
            description = "Sends a reset link if the account exists. Always returns the same message.")
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Request accepted")
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        service.sendPasswordResetEmail(request.email());
        return ResponseEntity.ok("If an account with that email exists, a reset link has been sent.");
    }

    @Operation(summary = "Reset password", description = "Sets a new password using a valid reset token.")
    @SecurityRequirements
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired token, or validation error", content = @Content)
    })
    @PostMapping("/reset-password")
    public ResponseEntity<String > resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        service.resetPassword(request);
        return ResponseEntity.ok("Password reset successfully.");
    }
}
