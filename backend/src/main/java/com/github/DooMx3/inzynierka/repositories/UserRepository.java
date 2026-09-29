package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByOrganisationAndMembershipStatus(
            Organisation organisation,
            MembershipStatus membershipStatus
    );
}
