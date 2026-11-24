package com.github.DooMx3.inzynierka.dto.ingredient;

import com.github.DooMx3.inzynierka.entities.BatchIngredient;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "Ingredient entry attached to a production batch.")
public record BatchIngredientResponse(
    UUID id,
    UUID ingredientId,
    String ingredientNumber,
    String ingredientName,
    @Schema(description = "Quantity in grams") BigDecimal quantityGrams) {
  public static BatchIngredientResponse from(BatchIngredient batchIngredient) {
    return new BatchIngredientResponse(
        batchIngredient.getId(),
        batchIngredient.getIngredient().getId(),
        "ING-%03d".formatted(batchIngredient.getIngredient().getNumber()),
        batchIngredient.getIngredient().getName(),
        batchIngredient.getQuantityGrams());
  }
}
