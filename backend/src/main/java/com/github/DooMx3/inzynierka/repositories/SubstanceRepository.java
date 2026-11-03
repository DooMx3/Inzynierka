package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Substance;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubstanceRepository extends JpaRepository<Substance, UUID> {

  List<Substance> findByOrganisationAndActiveTrue(Organisation organisation);

  Optional<Substance> findByIdAndOrganisation(UUID id, Organisation organisation);
}
