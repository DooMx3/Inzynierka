package com.github.DooMx3.inzynierka.dto.pest;

import com.github.DooMx3.inzynierka.enums.PestObservationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record PestObservationRequest(
    @NotNull UUID fieldId,
    @NotNull PestObservationType type,
    @NotBlank @Size(max = 255) String name,
    @NotNull LocalDate observedAt,
    @Size(max = 2000) String description) {}
