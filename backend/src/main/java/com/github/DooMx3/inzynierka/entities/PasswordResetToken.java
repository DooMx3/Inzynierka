package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "password_reset_token")
@Data
public class PasswordResetToken {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @Column(nullable = false, unique = true)
  private String tokenHash;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(nullable = false)
  private Instant expiryDate;

  @Column(nullable = false)
  private boolean used = false;

  public boolean isExpired() {
    return Instant.now().isAfter(expiryDate);
  }
}
