package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(
    name = "batch_source",
    uniqueConstraints = @UniqueConstraint(columnNames = {"sourceBatchId", "targetBatchId"}))
@Data
public class BatchSource {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "sourceBatchId", nullable = false)
  private Batch sourceBatch;

  @NotNull
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "targetBatchId", nullable = false)
  private Batch targetBatch;

  @NotNull
  @Positive
  @Digits(integer = 8, fraction = 2)
  @Column(name = "quantity", nullable = false, precision = 10, scale = 2)
  private BigDecimal quantity;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;
}
