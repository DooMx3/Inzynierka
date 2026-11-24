package com.github.DooMx3.inzynierka.dto.ingredient;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

@Schema(description = "Ingredient and its nutritional values per 100 grams.")
public record IngredientRequest(
    @Schema(description = "Ingredient name", example = "Potassium metabisulfite")
        @NotBlank
        @Size(max = 255)
        String name,
    @Schema(description = "Energy in kilocalories", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal energyContent,
    @Schema(description = "Fat in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal fat,
    @Schema(description = "Saturated fatty acids in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal saturatedFattyAcids,
    @Schema(description = "Carbohydrates in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal carbs,
    @Schema(description = "Sugars in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal sugars,
    @Schema(description = "Protein in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal protein,
    @Schema(description = "Salt in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal salt,
    @Schema(description = "Dietary fibre in grams", example = "0")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal fibers) {}
