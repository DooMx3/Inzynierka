package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "bottling")
@Data
public class Bottling {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "batch_id", nullable = false)
  private Batch batch;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(length = 2000)
  private String description;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal quantity;

  @Column(name = "bottled_at", nullable = false)
  private LocalDateTime bottledAt;

  @Column(nullable = false)
  private boolean active = true;
}
