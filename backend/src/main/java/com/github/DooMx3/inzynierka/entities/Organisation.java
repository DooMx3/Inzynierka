package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "\"taxId\"", length = 20)
    private String taxId;

    @Column(name = "street", length = 255)
    private String street;

    @Column(name = "\"postalCode\"", length = 20)
    private String postalCode;

    @Column(name = "city", nullable = false, length = 255)
    private String city;

    @Column(name = "\"logoPath\"", length = 255)
    private String logoPath;

    @Column(name = "motto", length = 512)
    private String motto;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "\"createdAt\"", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void setCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
