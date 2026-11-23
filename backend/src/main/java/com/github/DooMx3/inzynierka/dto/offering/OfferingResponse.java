package com.github.DooMx3.inzynierka.dto.offering;

import com.github.DooMx3.inzynierka.entities.Offering;
import java.util.UUID;

public record OfferingResponse(
    UUID id, UUID organisationId, UUID wineId, String wineName, String wineDescription, int price) {
  public static OfferingResponse from(Offering offering) {
    return new OfferingResponse(
        offering.getId(),
        offering.getOrganisation().getId(),
        offering.getWine().getId(),
        offering.getWine().getName(),
        offering.getWine().getDescription(),
        offering.getPrice());
  }
}
