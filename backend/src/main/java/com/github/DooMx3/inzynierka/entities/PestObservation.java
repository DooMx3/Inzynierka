package com.github.DooMx3.inzynierka.entities;

import com.github.DooMx3.inzynierka.enums.PestObservationType;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "pest_observation")
@Data
public class PestObservation {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "field_id", nullable = false)
  private Field field;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private PestObservationType type;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(name = "observed_at", nullable = false)
  private LocalDate observedAt;

  @Column(length = 2000)
  private String description;

  @Column(nullable = false)
  private boolean active = true;
}
