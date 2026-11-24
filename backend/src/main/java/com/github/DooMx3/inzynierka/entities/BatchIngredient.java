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
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "batch_ingredient")
@Data
public class BatchIngredient {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @NotNull
  @ManyToOne(optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @NotNull
  @ManyToOne(optional = false)
  @JoinColumn(name = "batch_id", nullable = false)
  private Batch batch;

  @NotNull
  @ManyToOne(optional = false)
  @JoinColumn(name = "ingredient_id", nullable = false)
  private Ingredient ingredient;

  @NotNull
  @Positive
  @Digits(integer = 8, fraction = 2)
  @Column(name = "quantity_grams", nullable = false, precision = 10, scale = 2)
  private BigDecimal quantityGrams;
}
