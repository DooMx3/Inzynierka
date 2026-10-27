package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "organisation_logo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrganisationLogo {

  @Id
  @Column(name = "organisation_id")
  private UUID organisationId;

  @Column(name = "content_type", nullable = false, length = 50)
  private String contentType;

  @Column(name = "image_data", nullable = false, columnDefinition = "bytea")
  private byte[] imageData;

  @Column(name = "file_size", nullable = false)
  private long fileSize;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  @PreUpdate
  void updateTimestamp() {
    updatedAt = LocalDateTime.now();
  }
}
