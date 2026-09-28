package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.PasswordResetToken;
import com.github.DooMx3.inzynierka.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
