package com.github.DooMx3.inzynierka.entities;

import com.github.DooMx3.inzynierka.enums.BatchStage;
import jakarta.persistence.*;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "batch")
@Data
public class Batch {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @Size(max = 255)
  @Column(name = "name", length = 255)
  private String name;

  @NotNull
  @Column(name = "stage", nullable = false)
  @Enumerated(EnumType.STRING)
  private BatchStage stage;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(name = "quantity", nullable = false, precision = 10, scale = 2)
  private BigDecimal quantity;

  @Column(name = "isSpoiled", nullable = false)
  private boolean isSpoiled = false;

  @Column(name = "deleted", nullable = false)
  private boolean deleted = false;

  @CreationTimestamp
  @Column(name = "createdAt", nullable = false, updatable = false)
  private LocalDateTime createdAt;
}
