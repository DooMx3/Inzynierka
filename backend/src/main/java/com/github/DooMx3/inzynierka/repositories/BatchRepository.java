package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchRepository extends JpaRepository<Batch, UUID> {
  List<Batch> findByOrganisationAndDeletedFalseOrderByCreatedAtDescIdAsc(Organisation organisation);

  Optional<Batch> findByIdAndOrganisation(UUID id, Organisation organisation);
}
