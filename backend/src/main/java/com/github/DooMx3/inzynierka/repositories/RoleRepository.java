package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Role;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, UUID> {
  Optional<Role> findByName(String name);
}
