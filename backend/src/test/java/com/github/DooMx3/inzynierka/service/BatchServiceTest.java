package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.batch.BatchFromHarvestRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchResponse;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.BatchIngredientRequest;
import com.github.DooMx3.inzynierka.dto.ingredient.BatchIngredientResponse;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.BatchIngredient;
import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.entities.Ingredient;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.BatchStage;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.repositories.BatchIngredientRepository;
import com.github.DooMx3.inzynierka.repositories.BatchRepository;
import com.github.DooMx3.inzynierka.repositories.BatchSourceRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestBatchRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestRepository;
import com.github.DooMx3.inzynierka.repositories.IngredientRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
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
class BatchServiceTest {
  @Mock private BatchRepository batchRepository;
  @Mock private BatchIngredientRepository batchIngredientRepository;
  @Mock private HarvestBatchRepository harvestBatchRepository;
  @Mock private BatchSourceRepository batchSourceRepository;
  @Mock private HarvestRepository harvestRepository;
  @Mock private IngredientRepository ingredientRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private BatchService service;

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
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));
  }

  @Test
  void shouldCreateBatch() {
    BatchRequest request =
        new BatchRequest("Solaris 2026", BatchStage.MUST, new BigDecimal("125.50"), false);
    when(batchRepository.save(any(Batch.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    BatchResponse response = service.create(request, oenologist);

    assertEquals("Solaris 2026", response.name());
    assertEquals(BatchStage.MUST, response.stage());
    assertEquals(new BigDecimal("125.50"), response.quantity());
    assertFalse(response.deleted());
  }

  @Test
  void shouldCreateBatchFromActiveHarvest() {
    Harvest harvest = new Harvest();
    harvest.setId(UUID.randomUUID());
    harvest.setOrganisation(organisation);
    harvest.setActive(true);
    harvest.setAmountKg(200);
    HarvestBatchRequest sourceRequest =
        new HarvestBatchRequest(harvest.getId(), new BigDecimal("125.00"));
    BatchFromHarvestRequest request =
        new BatchFromHarvestRequest("Harvest batch", Set.of(sourceRequest));

    when(harvestRepository.findByIdAndOrganisation(harvest.getId(), organisation))
        .thenReturn(Optional.of(harvest));
    when(batchRepository.save(any(Batch.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    BatchResponse response = service.createFromHarvest(request, oenologist);

    assertEquals(new BigDecimal("125.00"), response.quantity());
    assertEquals(BatchStage.MUST, response.stage());
    verify(harvestBatchRepository).saveAll(any());
  }

  @Test
  void shouldChangeStageForward() {
    Batch batch = batch(BatchStage.MUST);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(batchRepository.save(batch)).thenReturn(batch);

    BatchResponse response = service.changeStage(batch.getId(), BatchStage.FERMENTING, oenologist);

    assertEquals(BatchStage.FERMENTING, response.stage());
  }

  @Test
  void shouldAllowChangingStageInEitherDirection() {
    Batch batch = batch(BatchStage.AGED);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(batchRepository.save(batch)).thenReturn(batch);

    BatchResponse response = service.changeStage(batch.getId(), BatchStage.FERMENTING, oenologist);

    assertEquals(BatchStage.FERMENTING, response.stage());
  }

  @Test
  void shouldMarkBatchAsSpoiledAndUnspoiled() {
    Batch batch = batch(BatchStage.FERMENTING);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(batchRepository.save(batch)).thenReturn(batch);

    BatchResponse spoiledResponse = service.changeSpoiled(batch.getId(), true, oenologist);
    assertTrue(spoiledResponse.isSpoiled());
    assertTrue(batch.isSpoiled());

    BatchResponse unspoiledResponse = service.changeSpoiled(batch.getId(), false, oenologist);
    assertFalse(unspoiledResponse.isSpoiled());
    assertFalse(batch.isSpoiled());
  }

  @Test
  void shouldSoftDeleteBatch() {
    Batch batch = batch(BatchStage.MUST);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));

    service.delete(batch.getId(), oenologist);

    assertTrue(batch.isDeleted());
    verify(batchRepository).save(batch);
  }

  @Test
  void shouldListBatchHistory() {
    Batch batch = batch(BatchStage.FERMENTING);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(harvestBatchRepository.findByBatch(batch)).thenReturn(List.of());
    when(batchSourceRepository.findByTargetBatch(batch)).thenReturn(List.of());
    when(batchSourceRepository.findBySourceBatch(batch)).thenReturn(List.of());

    BatchHistoryResponse history = service.getHistory(batch.getId(), oenologist);

    assertEquals(batch.getId(), history.batch().id());
    assertTrue(history.harvestSources().isEmpty());
  }

  @Test
  void shouldAttachIngredientAndQuantityToBatch() {
    Batch batch = batch(BatchStage.FERMENTING);
    Ingredient ingredient = ingredient();
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(ingredientRepository.findByIdAndOrganisation(ingredient.getId(), organisation))
        .thenReturn(Optional.of(ingredient));
    when(batchIngredientRepository.save(any(BatchIngredient.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    BatchIngredientResponse response =
        service.addBatchIngredient(
            batch.getId(),
            new BatchIngredientRequest(ingredient.getId(), new BigDecimal("25.50")),
            oenologist);

    assertEquals(ingredient.getId(), response.ingredientId());
    assertEquals("ING-001", response.ingredientNumber());
    assertEquals(new BigDecimal("25.50"), response.quantityGrams());
  }

  @Test
  void shouldRejectInactiveIngredientsWhenAttachingThemToBatch() {
    Batch batch = batch(BatchStage.FERMENTING);
    Ingredient ingredient = ingredient();
    ingredient.setActive(false);
    when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
    when(ingredientRepository.findByIdAndOrganisation(ingredient.getId(), organisation))
        .thenReturn(Optional.of(ingredient));

    assertThrows(
        com.github.DooMx3.inzynierka.exceptions.InactiveResourceException.class,
        () ->
            service.addBatchIngredient(
                batch.getId(),
                new BatchIngredientRequest(ingredient.getId(), BigDecimal.ONE),
                oenologist));
  }

  @Test
  void shouldRejectQuantityAboveHarvest() {
    Harvest harvest = new Harvest();
    harvest.setId(UUID.randomUUID());
    harvest.setOrganisation(organisation);
    harvest.setActive(true);
    harvest.setAmountKg(100);
    BatchFromHarvestRequest request =
        new BatchFromHarvestRequest(
            "Too large", Set.of(new HarvestBatchRequest(harvest.getId(), new BigDecimal("101"))));
    when(harvestRepository.findByIdAndOrganisation(harvest.getId(), organisation))
        .thenReturn(Optional.of(harvest));

    assertThrows(
        com.github.DooMx3.inzynierka.exceptions.ResourceConflictException.class,
        () -> service.createFromHarvest(request, oenologist));
    verify(harvestBatchRepository, never()).save(any());
  }

  private Batch batch(BatchStage stage) {
    Batch batch = new Batch();
    batch.setId(UUID.randomUUID());
    batch.setOrganisation(organisation);
    batch.setName("Test batch");
    batch.setStage(stage);
    batch.setQuantity(new BigDecimal("100.00"));
    batch.setDeleted(false);
    return batch;
  }

  private Ingredient ingredient() {
    Ingredient ingredient = new Ingredient();
    ingredient.setId(UUID.randomUUID());
    ingredient.setNumber(1L);
    ingredient.setName("Potassium metabisulfite");
    ingredient.setActive(true);
    ingredient.setOrganisation(organisation);
    return ingredient;
  }
}
