package com.github.DooMx3.inzynierka.dto.substance;

import jakarta.validation.constraints.NotBlank;

public record SubstanceRequest(@NotBlank String name) {}
