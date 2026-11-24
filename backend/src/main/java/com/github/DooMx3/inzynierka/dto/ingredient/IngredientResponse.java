package com.github.DooMx3.inzynierka.dto.ingredient;

import com.github.DooMx3.inzynierka.entities.Ingredient;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "Ingredient catalogue entry.")
public record IngredientResponse(
    @Schema(description = "Ingredient identifier") UUID id,
    @Schema(description = "Automatically generated ingredient number", example = "ING-001")
        String number,
    String name,
    @Schema(description = "Energy in kilocalories per 100 grams") BigDecimal energyContent,
    @Schema(description = "Fat in grams per 100 grams") BigDecimal fat,
    @Schema(description = "Saturated fatty acids in grams per 100 grams")
        BigDecimal saturatedFattyAcids,
    @Schema(description = "Carbohydrates in grams per 100 grams") BigDecimal carbs,
    @Schema(description = "Sugars in grams per 100 grams") BigDecimal sugars,
    @Schema(description = "Protein in grams per 100 grams") BigDecimal protein,
    @Schema(description = "Salt in grams per 100 grams") BigDecimal salt,
    @Schema(description = "Dietary fibre in grams per 100 grams") BigDecimal fibers) {
  public static IngredientResponse from(Ingredient ingredient) {
    return new IngredientResponse(
        ingredient.getId(),
        "ING-%03d".formatted(ingredient.getNumber()),
        ingredient.getName(),
        ingredient.getEnergyContent(),
        ingredient.getFat(),
        ingredient.getSaturatedFattyAcids(),
        ingredient.getCarbs(),
        ingredient.getSugars(),
        ingredient.getProtein(),
        ingredient.getSalt(),
        ingredient.getFibers());
  }
}
