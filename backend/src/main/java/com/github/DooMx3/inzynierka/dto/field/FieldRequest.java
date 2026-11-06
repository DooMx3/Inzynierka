package com.github.DooMx3.inzynierka.dto.field;

import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record FieldRequest(
    @NotNull @DecimalMin("0.01") @Digits(integer = 6, fraction = 2) BigDecimal areaAre,
    @NotNull GrapeVariety grapeVariety,
    @Size(max = 100) String otherGrapeVariety,
    @NotNull GrapeColor grapeColor) {}
