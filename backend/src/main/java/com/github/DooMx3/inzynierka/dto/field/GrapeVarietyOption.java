package com.github.DooMx3.inzynierka.dto.field;

import com.github.DooMx3.inzynierka.enums.GrapeVariety;

public record GrapeVarietyOption(String value, String label, boolean requiresCustomName) {

  public static GrapeVarietyOption from(GrapeVariety variety) {
    return new GrapeVarietyOption(
        variety.name(), variety.getDisplayName(), variety == GrapeVariety.OTHER);
  }
}
