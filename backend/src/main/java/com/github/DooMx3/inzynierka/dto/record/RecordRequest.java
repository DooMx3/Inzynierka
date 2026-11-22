package com.github.DooMx3.inzynierka.dto.record;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.Instant;

public record RecordRequest(
    Instant recordedAt,
    @DecimalMin("0.0") @Digits(integer = 4, fraction = 2) BigDecimal sugarLevel,
    @DecimalMin("0.0") @Digits(integer = 3, fraction = 2) BigDecimal acidity,
    @JsonProperty("pH") @DecimalMin("2.5") @DecimalMax("4.5") @Digits(integer = 2, fraction = 2)
        BigDecimal ph,
    @Digits(integer = 3, fraction = 2) BigDecimal temperature,
    @DecimalMin("0.0") @DecimalMax("22.0") @Digits(integer = 2, fraction = 2)
        BigDecimal alcoholContent) {

  @AssertTrue(message = "At least one chemical parameter is required")
  @JsonIgnore
  public boolean isAnyParameterProvided() {
    return sugarLevel != null
        || acidity != null
        || ph != null
        || temperature != null
        || alcoholContent != null;
  }
}
