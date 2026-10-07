package com.github.DooMx3.inzynierka.dto.user;

import jakarta.validation.constraints.NotNull;

public record DeactivateUserRequest(@NotNull String password) {}
