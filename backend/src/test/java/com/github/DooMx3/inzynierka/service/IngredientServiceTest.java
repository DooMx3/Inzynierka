package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.ingredient.IngredientRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.IngredientResponse;
import com.github.DooMx3.inzynierka.entities.Ingredient;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.IngredientRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IngredientServiceTest {
  @Mock private IngredientRepository ingredientRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private IngredientService service;

  private Organisation organisation;
  private User oenologist;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    oenologist =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OENOLOGIST)))
            .build();
  }

  @Test
  void shouldCreateIngredientWithGeneratedNumberAndTrimmedName() {
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));
    when(ingredientRepository.nextNumber()).thenReturn(1L);
    when(ingredientRepository.save(any(Ingredient.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    IngredientResponse response =
        service.create(request("  Potassium metabisulfite  "), oenologist);

    assertEquals("ING-001", response.number());
    assertEquals("Potassium metabisulfite", response.name());
    assertEquals(BigDecimal.ZERO, response.energyContent());
  }

  @Test
  void shouldOnlyExposeIngredientsFromTheUsersOrganisation() {
    UUID id = UUID.randomUUID();
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));
    when(ingredientRepository.findByIdAndOrganisation(id, organisation))
        .thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.getById(id, oenologist));
  }

  @Test
  void shouldSoftDeleteIngredientToPreserveBatchHistory() {
    Ingredient ingredient = ingredient(7L);
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));
    when(ingredientRepository.findByIdAndOrganisation(ingredient.getId(), organisation))
        .thenReturn(Optional.of(ingredient));

    service.delete(ingredient.getId(), oenologist);

    assertFalse(ingredient.isActive());
    verify(ingredientRepository).save(ingredient);
  }

  @Test
  void shouldRejectUsersWithoutIngredientManagementRole() {
    User worker =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.WORKER)))
            .build();
    when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));

    assertThrows(InsufficientPermissionException.class, () -> service.getAll(worker));
  }

  private Ingredient ingredient(long number) {
    Ingredient ingredient = new Ingredient();
    ingredient.setId(UUID.randomUUID());
    ingredient.setNumber(number);
    ingredient.setName("Yeast");
    ingredient.setEnergyContent(BigDecimal.ZERO);
    ingredient.setFat(BigDecimal.ZERO);
    ingredient.setSaturatedFattyAcids(BigDecimal.ZERO);
    ingredient.setCarbs(BigDecimal.ZERO);
    ingredient.setSugars(BigDecimal.ZERO);
    ingredient.setProtein(BigDecimal.ZERO);
    ingredient.setSalt(BigDecimal.ZERO);
    ingredient.setFibers(BigDecimal.ZERO);
    ingredient.setOrganisation(organisation);
    return ingredient;
  }

  private IngredientRequest request(String name) {
    return new IngredientRequest(
        name,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO);
  }
}
