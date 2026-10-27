package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.OrganisationLogo;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganisationLogoRepository extends JpaRepository<OrganisationLogo, UUID> {}
