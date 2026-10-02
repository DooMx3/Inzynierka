package com.github.DooMx3.inzynierka.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
    @NotBlank String firstname, @Email @NotBlank String email, @NotBlank String password) {}
