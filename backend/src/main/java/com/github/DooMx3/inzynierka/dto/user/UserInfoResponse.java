package com.github.DooMx3.inzynierka.dto.user;

import com.github.DooMx3.inzynierka.entities.Organisation;
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
    Set<String> roles,
    String logoPath) {
  public static UserInfoResponse from(User user) {
    Organisation org = user.getOrganisation();
    return new UserInfoResponse(
        user.getId(),
        user.getMembershipStatus(),
        user.getFirstname(),
        user.getLastname(),
        user.getPhoneNumber(),
        user.getEmail(),
        user.isActive(),
        user.getRoles().stream().map(Enum::name).collect(Collectors.toSet()),
        org != null ? org.getLogoPath() : null);
  }
}
