package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "role")
@Data
public class Role {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  private String name;
  private String description;
}
