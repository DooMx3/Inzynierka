package com.github.DooMx3.inzynierka.dto.batch;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record BatchFromHarvestRequest(
    @Size(max = 255) String name, @NotEmpty Set<@NotNull @Valid HarvestBatchRequest> harvests) {}
