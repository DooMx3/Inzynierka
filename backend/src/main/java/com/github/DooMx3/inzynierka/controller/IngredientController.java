package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.ingredient.IngredientRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.IngredientResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Ingredients", description = "Organisation ingredient catalogue")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/ingredients")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('OENOLOGIST')")
public class IngredientController {
  private final IngredientService ingredientService;

  @Operation(
      summary = "Create ingredient",
      description = "Creates an ingredient with nutritional values per 100 grams.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Ingredient created"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content)
  })
  @PostMapping
  public ResponseEntity<IngredientResponse> create(
      @RequestBody @Valid IngredientRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(ingredientService.create(request, user));
  }

  @Operation(
      summary = "List ingredients",
      description =
          "Returns active ingredients belonging to the authenticated user's organisation.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Ingredients returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content)
  })
  @GetMapping
  public ResponseEntity<List<IngredientResponse>> getAll(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(ingredientService.getAll(user));
  }

  @Operation(summary = "Get ingredient")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Ingredient returned"),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Ingredient not found", content = @Content)
  })
  @GetMapping("/{id}")
  public ResponseEntity<IngredientResponse> getById(
      @Parameter(description = "Ingredient identifier") @PathVariable UUID id,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(ingredientService.getById(id, user));
  }

  @Operation(summary = "Replace ingredient")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Ingredient updated"),
    @ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Ingredient not found", content = @Content)
  })
  @PutMapping("/{id}")
  public ResponseEntity<IngredientResponse> update(
      @Parameter(description = "Ingredient identifier") @PathVariable UUID id,
      @RequestBody @Valid IngredientRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(ingredientService.update(id, request, user));
  }

  @Operation(
      summary = "Delete ingredient",
      description =
          "Deactivates the ingredient. Existing batch ingredient records remain available as history.")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Ingredient deactivated", content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner or oenologist required",
        content = @Content),
    @ApiResponse(responseCode = "404", description = "Ingredient not found", content = @Content)
  })
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @Parameter(description = "Ingredient identifier") @PathVariable UUID id,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    ingredientService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
