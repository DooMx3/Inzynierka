package com.github.DooMx3.inzynierka.dto.user;

import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record UserInfoResponse(
    UUID id,
    MembershipStatus membershipStatus,
    String firstname,
    String lastname,
    String phoneNumber,
    String email,
    boolean active,
    Set<String> roles) {
  public static UserInfoResponse from(User user) {
    return new UserInfoResponse(
        user.getId(),
        user.getMembershipStatus(),
        user.getFirstname(),
        user.getLastname(),
        user.getPhoneNumber(),
        user.getEmail(),
        user.isActive(),
        user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
  }
}
