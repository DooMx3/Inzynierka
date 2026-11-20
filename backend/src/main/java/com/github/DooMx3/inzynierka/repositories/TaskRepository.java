package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Task;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {

  List<Task> findByOrganisationAndActiveTrueOrderByDueDateAscIdAsc(Organisation organisation);

  Optional<Task> findByIdAndOrganisationAndActiveTrue(UUID id, Organisation organisation);
}
