package com.github.DooMx3.inzynierka.dto.offering;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record OfferingRequest(@NotNull UUID wineId, @PositiveOrZero int price) {}
