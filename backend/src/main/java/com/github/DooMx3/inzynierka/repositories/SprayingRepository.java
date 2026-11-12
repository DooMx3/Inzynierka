package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Spraying;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SprayingRepository extends JpaRepository<Spraying, UUID> {

  List<Spraying> findByFieldOrganisationOrderBySprayingDateDesc(Organisation organisation);
}
