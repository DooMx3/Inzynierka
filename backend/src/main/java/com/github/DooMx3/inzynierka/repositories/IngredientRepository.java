package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Ingredient;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IngredientRepository extends JpaRepository<Ingredient, UUID> {
  List<Ingredient> findByOrganisationAndActiveTrueOrderByNumberAsc(Organisation organisation);

  Optional<Ingredient> findByIdAndOrganisation(UUID id, Organisation organisation);

  @Query(value = "SELECT nextval('ingredient_number_seq')", nativeQuery = true)
  Long nextNumber();
}
