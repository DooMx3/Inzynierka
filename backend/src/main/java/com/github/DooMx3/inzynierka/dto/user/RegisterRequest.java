package com.github.DooMx3.inzynierka.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank String firstname,
    @NotBlank String lastname,
    @Email @NotBlank String email,
    @NotBlank(message = "Password cannot be empty")
        @Size(min = 16, message = "Password must have at least 16 characters")
        @Pattern(
            regexp = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+",
            message =
                "Password must contain at least one uppercase letter, one lowercase letter, one digit and one special character")
        String password) {}
