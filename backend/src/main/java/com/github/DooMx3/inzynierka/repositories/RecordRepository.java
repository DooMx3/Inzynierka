package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Record;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordRepository extends JpaRepository<Record, UUID> {
  Optional<Record> findByIdAndOrganisation(UUID id, Organisation organisation);

  List<Record> findByBatch_IdAndOrganisationAndActiveTrueOrderByRecordedAtDescIdAsc(
      UUID batchId, Organisation organisation);

  Optional<Record> findByIdAndBatch_IdAndOrganisationAndActiveTrue(
      UUID id, UUID batchId, Organisation organisation);
}
