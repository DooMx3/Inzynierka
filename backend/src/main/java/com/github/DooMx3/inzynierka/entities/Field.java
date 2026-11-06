package com.github.DooMx3.inzynierka.entities;

import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "field")
@Data
public class Field {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @Enumerated(EnumType.STRING)
  @Column(name = "grape_variety", nullable = false, length = 32)
  private GrapeVariety grapeVariety;

  @Column(name = "other_grape_variety", length = 100)
  private String otherGrapeVariety;

  @Enumerated(EnumType.STRING)
  @Column(name = "grape_color", nullable = false, length = 16)
  private GrapeColor grapeColor;

  @Column(name = "area_are", nullable = false, precision = 8, scale = 2)
  private BigDecimal areaAre;

  @Column(nullable = false)
  private boolean active = true;
}
