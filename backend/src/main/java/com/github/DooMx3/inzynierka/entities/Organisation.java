package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "organisation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organisation {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    private UUID id;
    private String name;
    private String taxId;
    private String street;
    private String postalCode;
    private String city;
    private String logoPath;
    private String motto;
    @Builder.Default
    private boolean active = true;
    private LocalDateTime createdAt;

    @PrePersist
    void setCreatedAt() {
        active = true;
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
