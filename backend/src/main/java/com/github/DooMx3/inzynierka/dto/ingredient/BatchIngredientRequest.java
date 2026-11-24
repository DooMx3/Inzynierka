package com.github.DooMx3.inzynierka.dto.ingredient;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "Ingredient and quantity to attach to a production batch.")
public record BatchIngredientRequest(
    @Schema(description = "Ingredient identifier") @NotNull UUID ingredientId,
    @Schema(description = "Quantity in grams", example = "25.5")
        @NotNull
        @Positive
        @Digits(integer = 8, fraction = 2)
        BigDecimal quantityGrams) {}
