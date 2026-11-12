package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity(name = "Spraying")
@Table(name = "spraying")
@Data
public class Spraying {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "field_id", nullable = false)
  private Field field;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "equipment_id", nullable = false)
  private Equipment equipment;

  @Column(nullable = false)
  private Instant sprayingDate;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "substance_id", nullable = false)
  private Substance substance;

  @Column(nullable = false)
  private int quantity;

  @Column(nullable = false)
  private Instant due;
}
