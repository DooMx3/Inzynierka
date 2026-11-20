package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Bottling;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BottlingRepository extends JpaRepository<Bottling, UUID> {
  Optional<Bottling> findByIdAndOrganisation(UUID id, Organisation organisation);
}
