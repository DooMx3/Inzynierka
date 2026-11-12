package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.PestObservation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PestObservationRepository extends JpaRepository<PestObservation, UUID> {

  List<PestObservation> findByOrganisationAndActiveTrueOrderByObservedAtDescIdAsc(
      Organisation organisation);

  List<PestObservation> findByOrganisationAndFieldIdAndActiveTrueOrderByObservedAtDescIdAsc(
      Organisation organisation, UUID fieldId);

  Optional<PestObservation> findByIdAndOrganisation(UUID id, Organisation organisation);
}
