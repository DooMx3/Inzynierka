package com.github.DooMx3.inzynierka.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
    @NotBlank String oldPassword,
    @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
        String newPassword) {}
