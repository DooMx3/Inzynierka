package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "Spraying")
@Table(name = "spraying")
@Data
public class Spraying {
    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id")
    private Field field;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id")
    private Equipment equipment;

    private Instant sprayingDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substance_id")
    private Substance substance;

    private int quantity;

    private Instant due;
}
