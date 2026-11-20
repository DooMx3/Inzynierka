package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "record")
@Data
public class Record {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "batch_id")
  private Batch batch;

  @Column(name = "sugar_level", precision = 6, scale = 2)
  private BigDecimal sugarLevel;

  @Column(precision = 5, scale = 2)
  private BigDecimal acidity;

  @Column(name = "ph", precision = 4, scale = 2)
  private BigDecimal ph;

  @Column(name = "alcohol_content", precision = 4, scale = 2)
  private BigDecimal alcoholContent;

  @Column(nullable = false)
  private boolean active = true;
}
