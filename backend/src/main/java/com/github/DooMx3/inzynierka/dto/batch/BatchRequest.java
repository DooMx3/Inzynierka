package com.github.DooMx3.inzynierka.dto.batch;

import com.github.DooMx3.inzynierka.enums.BatchStage;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record BatchRequest(
    @Size(max = 255) String name,
    @NotNull BatchStage stage,
    @NotNull @PositiveOrZero @Digits(integer = 8, fraction = 2) BigDecimal quantity,
    boolean isSpoiled) {}
