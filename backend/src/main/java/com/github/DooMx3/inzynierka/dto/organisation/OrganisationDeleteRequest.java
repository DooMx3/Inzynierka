package com.github.DooMx3.inzynierka.dto.organisation;

import jakarta.validation.constraints.NotBlank;

public record OrganisationDeleteRequest(@NotBlank String password) {}
