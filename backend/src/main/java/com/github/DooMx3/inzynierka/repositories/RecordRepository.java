package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Record;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordRepository extends JpaRepository<Record, UUID> {
  Optional<Record> findByIdAndOrganisation(UUID id, Organisation organisation);
}
