package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.field.GrapeVarietyOption;
import com.github.DooMx3.inzynierka.enums.GrapeColor;
import com.github.DooMx3.inzynierka.enums.GrapeVariety;
import java.util.Arrays;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasAuthority('OWNER')")
public class GrapeCatalogController {

  @GetMapping("/api/grape-types")
  public List<GrapeVarietyOption> getGrapeTypes() {
    return Arrays.stream(GrapeVariety.values()).map(GrapeVarietyOption::from).toList();
  }

  @GetMapping("/api/grape-colors")
  public List<GrapeColor> getGrapeColors() {
    return List.of(GrapeColor.values());
  }
}
