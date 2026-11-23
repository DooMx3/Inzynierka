package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Offering;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfferingRepository extends JpaRepository<Offering, UUID> {}
