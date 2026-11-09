package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {

  List<Equipment> findByOrganisationAndActiveTrueOrderByIdAsc(Organisation organisation);

  Optional<Equipment> findByIdAndOrganisation(UUID id, Organisation organisation);
}
