package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.ingredient.IngredientRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.IngredientResponse;
import com.github.DooMx3.inzynierka.entities.Ingredient;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.IngredientRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IngredientService {
  private final IngredientRepository ingredientRepository;
  private final UserRepository userRepository;

  @Transactional
  public IngredientResponse create(IngredientRequest request, User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    requireIngredientManager(authenticatedUser);

    Ingredient ingredient = new Ingredient();
    ingredient.setOrganisation(organisation);
    ingredient.setNumber(ingredientRepository.nextNumber());
    applyRequest(ingredient, request);
    return IngredientResponse.from(ingredientRepository.save(ingredient));
  }

  @Transactional
  public List<IngredientResponse> getAll(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    requireIngredientManager(authenticatedUser);
    return ingredientRepository
        .findByOrganisationAndActiveTrueOrderByNumberAsc(organisation)
        .stream()
        .map(IngredientResponse::from)
        .toList();
  }

  @Transactional
  public IngredientResponse getById(UUID id, User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    requireIngredientManager(authenticatedUser);
    return IngredientResponse.from(getActiveIngredient(id, organisation));
  }

  @Transactional
  public IngredientResponse update(UUID id, IngredientRequest request, User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    requireIngredientManager(authenticatedUser);
    Ingredient ingredient = getActiveIngredient(id, organisation);
    applyRequest(ingredient, request);
    return IngredientResponse.from(ingredientRepository.save(ingredient));
  }

  @Transactional
  public void delete(UUID id, User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    requireIngredientManager(authenticatedUser);
    Ingredient ingredient = getActiveIngredient(id, organisation);
    ingredient.setActive(false);
    ingredientRepository.save(ingredient);
  }

  private void applyRequest(Ingredient ingredient, IngredientRequest request) {
    ingredient.setName(request.name().trim());
    ingredient.setEnergyContent(request.energyContent());
    ingredient.setFat(request.fat());
    ingredient.setSaturatedFattyAcids(request.saturatedFattyAcids());
    ingredient.setCarbs(request.carbs());
    ingredient.setSugars(request.sugars());
    ingredient.setProtein(request.protein());
    ingredient.setSalt(request.salt());
    ingredient.setFibers(request.fibers());
  }

  private Ingredient getActiveIngredient(UUID id, Organisation organisation) {
    Ingredient ingredient =
        ingredientRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Ingredient not found"));
    if (!ingredient.isActive()) {
      throw new InactiveResourceException("Cannot access an inactive ingredient");
    }
    return ingredient;
  }

  private User getAuthenticatedUser(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }
    return userRepository
        .findById(user.getId())
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
  }

  private Organisation getActiveOrganisation(User authenticatedUser) {
    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access ingredients of an inactive organisation");
    }
    return organisation;
  }

  private void requireIngredientManager(User user) {
    if (!user.getRoles().contains(RoleName.OWNER)
        && !user.getRoles().contains(RoleName.OENOLOGIST)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or oenologist can manage ingredients");
    }
  }
}
