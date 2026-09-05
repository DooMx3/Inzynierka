package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrganisationRepository extends JpaRepository<Organisation, UUID> {
}