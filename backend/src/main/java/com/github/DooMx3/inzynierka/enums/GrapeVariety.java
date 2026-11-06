package com.github.DooMx3.inzynierka.enums;

public enum GrapeVariety {
  SOLARIS("Solaris"),
  REGENT("Regent"),
  RONDO("Rondo"),
  JOHANNITER("Johanniter"),
  SEYVAL_BLANC("Seyval Blanc"),
  MUSCARIS("Muscaris"),
  CABERNET_CORTIS("Cabernet Cortis"),
  HIBERNAL("Hibernal"),
  RIESLING("Riesling"),
  CHARDONNAY("Chardonnay"),
  PINOT_NOIR("Pinot Noir"),
  MERLOT("Merlot"),
  OTHER("Other");

  private final String displayName;

  GrapeVariety(String displayName) {
    this.displayName = displayName;
  }

  public String getDisplayName() {
    return displayName;
  }
}
