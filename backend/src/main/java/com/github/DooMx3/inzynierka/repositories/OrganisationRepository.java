package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Organisation;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganisationRepository extends JpaRepository<Organisation, UUID> {

  default void deleteById(UUID id) {
    preventPhysicalDelete();
  }

  default void delete(Organisation organisation) {
    preventPhysicalDelete();
  }

  default void deleteAll(Iterable<? extends Organisation> organisations) {
    preventPhysicalDelete();
  }

  default void deleteAll() {
    preventPhysicalDelete();
  }

  default void deleteAllById(Iterable<? extends UUID> ids) {
    preventPhysicalDelete();
  }

  default void deleteAllInBatch(Iterable<Organisation> organisations) {
    preventPhysicalDelete();
  }

  default void deleteAllInBatch() {
    preventPhysicalDelete();
  }

  default void deleteAllByIdInBatch(Iterable<UUID> ids) {
    preventPhysicalDelete();
  }

  private static void preventPhysicalDelete() {
    throw new UnsupportedOperationException(
        "Organisations use soft delete; call OrganisationService.deleteOrganisation instead");
  }
}
