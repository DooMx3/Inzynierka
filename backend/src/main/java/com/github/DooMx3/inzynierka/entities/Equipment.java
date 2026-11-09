package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "equipment")
@Data
public class Equipment {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(nullable = false, length = 100)
  private String type;

  @Column(name = "end_of_technical_inspection")
  private LocalDate endOfTechnicalInspection;

  @Column(nullable = false)
  private boolean active = true;
}
