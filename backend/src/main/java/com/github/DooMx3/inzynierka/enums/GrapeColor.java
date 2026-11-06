package com.github.DooMx3.inzynierka.enums;

public enum GrapeColor {
  RED("Red"),
  WHITE("White");

  private final String displayName;

  GrapeColor(String displayName) {
    this.displayName = displayName;
  }

  public String getDisplayName() {
    return displayName;
  }
}
