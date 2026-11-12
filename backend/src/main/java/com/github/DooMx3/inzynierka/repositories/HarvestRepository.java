package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HarvestRepository extends JpaRepository<Harvest, UUID> {

  List<Harvest> findByOrganisationAndActiveTrueOrderByHarvestDateDescIdAsc(
      Organisation organisation);

  List<Harvest> findByOrganisationAndFieldIdAndActiveTrueOrderByHarvestDateDescIdAsc(
      Organisation organisation, UUID fieldId);

  Optional<Harvest> findByIdAndOrganisation(UUID id, Organisation organisation);
}
