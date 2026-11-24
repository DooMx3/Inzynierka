package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "ingredient")
@Data
public class Ingredient {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @NotNull
  @Column(name = "ingredient_number", nullable = false, unique = true)
  private Long number;

  @NotNull
  @Size(max = 255)
  @Column(nullable = false)
  private String name;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(name = "energy_content", nullable = false, precision = 10, scale = 2)
  private BigDecimal energyContent;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal fat;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(name = "saturated_fatty_acids", nullable = false, precision = 10, scale = 2)
  private BigDecimal saturatedFattyAcids;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal carbs;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal sugars;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal protein;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal salt;

  @NotNull
  @PositiveOrZero
  @Digits(integer = 8, fraction = 2)
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal fibers;

  @NotNull
  @ManyToOne(optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @Column(nullable = false)
  private boolean active = true;
}
