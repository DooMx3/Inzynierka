package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.BatchIngredient;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchIngredientRepository extends JpaRepository<BatchIngredient, UUID> {
  List<BatchIngredient> findByBatchAndOrganisationOrderByIdAsc(
      Batch batch, Organisation organisation);

  Optional<BatchIngredient> findByIdAndBatchAndOrganisation(
      UUID id, Batch batch, Organisation organisation);
}
