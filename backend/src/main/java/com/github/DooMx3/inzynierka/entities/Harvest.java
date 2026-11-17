package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "field_harvest",
      joinColumns = @JoinColumn(name = "harvest_id"),
      inverseJoinColumns = @JoinColumn(name = "field_id"))
  private List<Field> fields = new ArrayList<>();

  @Column(name = "harvest_date", nullable = false)
  private LocalDate harvestDate;

  @Column(name = "amount_kg", nullable = false)
  private int amountKg;

  @Column(nullable = false)
  private boolean active = true;
}
