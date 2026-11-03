package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity(name = "substance")
@Data
public class Substance {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "organisation_id")
  private Organisation organisation;

  private boolean active = true;
}
