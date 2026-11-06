package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  @Query("SELECT u FROM User u LEFT JOIN FETCH u.organisation WHERE u.email = :email")
  Optional<User> findByEmailWithOrganisation(@Param("email") String email);

  boolean existsByEmail(String email);

  List<User> findByOrganisationIdAndMembershipStatus(
      UUID organisationId, MembershipStatus membershipStatus);

  List<User> findByOrganisationAndMembershipStatus(
      Organisation organisation, MembershipStatus membershipStatus);
}
