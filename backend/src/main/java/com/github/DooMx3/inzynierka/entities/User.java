package com.github.DooMx3.inzynierka.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "\"user\"")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "\"organisationId\"")
    private UUID organisationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"membershipStatus\"", nullable = false, length = 8)
    @Builder.Default
    private MembershipStatus membershipStatus = MembershipStatus.NONE;

    @Column(name = "\"firstName\"", nullable = false, length = 128)
    private String firstName;

    @Column(name = "\"lastName\"", nullable = false, length = 128)
    private String lastName;

    @Column(name = "\"phoneNumber\"", length = 16)
    private String phoneNumber;

    @Column(name = "\"passwordHash\"", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    public enum MembershipStatus {
        NONE,
        PENDING,
        MEMBER
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}