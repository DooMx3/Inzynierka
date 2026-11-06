package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FieldRepository extends JpaRepository<Field, UUID> {

  List<Field> findByOrganisationAndActiveTrueOrderByIdAsc(Organisation organisation);

  Optional<Field> findByIdAndOrganisation(UUID id, Organisation organisation);
}
