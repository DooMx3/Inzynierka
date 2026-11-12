package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "harvest")
@Data
public class Harvest {
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

  @Column(name = "harvest_date", nullable = false)
  private LocalDate harvestDate;

  @Column(name = "amount_kg", nullable = false)
  private int amountKg;

  @Column(nullable = false)
  private boolean active = true;
}
