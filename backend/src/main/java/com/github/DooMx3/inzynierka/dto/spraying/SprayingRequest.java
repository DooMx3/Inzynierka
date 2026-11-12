package com.github.DooMx3.inzynierka.dto.spraying;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;
import java.util.UUID;

public record SprayingRequest(
    @NotNull UUID fieldId,
    @NotNull UUID equipmentId,
    @NotNull UUID substanceId,
    @NotNull Instant sprayingDate,
    @Positive int quantity,
    @NotNull Instant due) {}
