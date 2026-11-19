package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.batch.BatchFromHarvestRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchRequest;
import com.github.DooMx3.inzynierka.dto.batch.BatchResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchSourceResponse;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchRequest;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchResponse;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.BatchSource;
import com.github.DooMx3.inzynierka.entities.Harvest;
import com.github.DooMx3.inzynierka.entities.HarvestBatch;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.BatchStage;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceConflictException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.BatchRepository;
import com.github.DooMx3.inzynierka.repositories.BatchSourceRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestBatchRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BatchService {
  private final BatchRepository batchRepository;
  private final HarvestBatchRepository harvestBatchRepository;
  private final BatchSourceRepository batchSourceRepository;
  private final HarvestRepository harvestRepository;
  private final UserRepository userRepository;

  @Transactional
  public BatchResponse create(BatchRequest request, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    Batch batch = new Batch();
    batch.setOrganisation(organisation);
    applyRequest(batch, request);
    return BatchResponse.from(batchRepository.save(batch));
  }

  @Transactional
  public BatchResponse createFromHarvest(BatchFromHarvestRequest request, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    BigDecimal total =
        request.harvests().stream()
            .map(HarvestBatchRequest::quantity)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

    Batch batch = new Batch();
    batch.setOrganisation(organisation);
    batch.setName(request.name());
    batch.setStage(BatchStage.MUST);
    batch.setQuantity(total);
    batch.setSpoiled(false);
    batch = batchRepository.save(batch);

    List<HarvestBatch> sources = new ArrayList<>(request.harvests().size());
    for (HarvestBatchRequest sourceRequest : request.harvests()) {
      Harvest harvest =
          harvestRepository
              .findByIdAndOrganisation(sourceRequest.harvestId(), organisation)
              .orElseThrow(() -> new ResourceNotFoundException("Harvest not found"));
      validateHarvestSource(harvest, sourceRequest.quantity());
      HarvestBatch source = new HarvestBatch();
      source.setOrganisation(organisation);
      source.setHarvest(harvest);
      source.setBatch(batch);
      source.setQuantity(sourceRequest.quantity());
      sources.add(source);
    }
    harvestBatchRepository.saveAll(sources);
    return BatchResponse.from(batch);
  }

  @Transactional
  public List<BatchResponse> getAll(User user) {
    Organisation organisation = getActiveOrganisationForReading(user);
    return batchRepository
        .findByOrganisationAndDeletedFalseOrderByCreatedAtDescIdAsc(organisation)
        .stream()
        .map(BatchResponse::from)
        .toList();
  }

  @Transactional
  public BatchResponse getById(UUID id, User user) {
    return BatchResponse.from(getActiveBatch(id, getActiveOrganisationForReading(user)));
  }

  @Transactional
  public BatchHistoryResponse getHistory(UUID id, User user) {
    Organisation organisation = getActiveOrganisationForReading(user);
    Batch batch = getActiveBatch(id, organisation);
    List<HarvestBatchResponse> harvestSources =
        harvestBatchRepository.findByBatch(batch).stream().map(HarvestBatchResponse::from).toList();
    List<BatchSourceResponse> sourceChanges =
        batchSourceRepository.findByTargetBatch(batch).stream()
            .map(BatchSourceResponse::from)
            .toList();
    List<BatchSourceResponse> targetChanges =
        batchSourceRepository.findBySourceBatch(batch).stream()
            .map(BatchSourceResponse::from)
            .toList();
    return new BatchHistoryResponse(
        BatchResponse.from(batch), harvestSources, sourceChanges, targetChanges);
  }

  @Transactional
  public BatchResponse update(UUID id, BatchRequest request, User user) {
    Batch batch = getActiveBatch(id, getActiveOrganisationForWriting(user));
    applyRequest(batch, request);
    return BatchResponse.from(batchRepository.save(batch));
  }

  @Transactional
  public BatchResponse changeStage(UUID id, BatchStage stage, User user) {
    Batch batch = getActiveBatch(id, getActiveOrganisationForWriting(user));
    if (stage == null) {
      throw new ResourceConflictException("A batch stage is required");
    }
    batch.setStage(stage);
    return BatchResponse.from(batchRepository.save(batch));
  }

  @Transactional
  public BatchResponse changeSpoiled(UUID id, boolean spoiled, User user) {
    Batch batch = getActiveBatch(id, getActiveOrganisationForWriting(user));
    batch.setSpoiled(spoiled);
    return BatchResponse.from(batchRepository.save(batch));
  }

  @Transactional
  public void delete(UUID id, User user) {
    Batch batch = getActiveBatch(id, getActiveOrganisationForWriting(user));
    batch.setDeleted(true);
    batchRepository.save(batch);
  }

  @Transactional
  public HarvestBatchResponse addHarvestSource(
      UUID batchId, HarvestBatchRequest request, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    Batch batch = getActiveBatch(batchId, organisation);
    Harvest harvest =
        harvestRepository
            .findByIdAndOrganisation(request.harvestId(), organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Harvest not found"));
    validateHarvestSource(harvest, request.quantity());
    HarvestBatch source = new HarvestBatch();
    source.setOrganisation(organisation);
    source.setBatch(batch);
    source.setHarvest(harvest);
    source.setQuantity(request.quantity());
    return HarvestBatchResponse.from(harvestBatchRepository.save(source));
  }

  @Transactional
  public HarvestBatchResponse updateHarvestSource(
      UUID sourceId, HarvestBatchRequest request, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    HarvestBatch source =
        harvestBatchRepository
            .findById(sourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Harvest batch source not found"));
    if (!organisation.getId().equals(source.getOrganisation().getId())) {
      throw new ResourceNotFoundException("Harvest batch source not found");
    }
    Harvest harvest =
        harvestRepository
            .findByIdAndOrganisation(request.harvestId(), organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Harvest not found"));
    validateHarvestSource(harvest, request.quantity());
    source.setHarvest(harvest);
    source.setQuantity(request.quantity());
    return HarvestBatchResponse.from(harvestBatchRepository.save(source));
  }

  @Transactional
  public BatchSourceResponse createBatchSource(
      UUID sourceBatchId, UUID targetBatchId, BigDecimal quantity, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    Batch source = getActiveBatch(sourceBatchId, organisation);
    Batch target = getActiveBatch(targetBatchId, organisation);
    if (source.getId().equals(target.getId())) {
      throw new ResourceConflictException("A batch cannot source itself");
    }
    if (quantity == null
        || quantity.signum() <= 0
        || quantity.compareTo(source.getQuantity()) > 0) {
      throw new ResourceConflictException(
          "Source quantity must be positive and not exceed batch quantity");
    }
    BatchSource link = new BatchSource();
    link.setOrganisation(organisation);
    link.setSourceBatch(source);
    link.setTargetBatch(target);
    link.setQuantity(quantity);
    return BatchSourceResponse.from(batchSourceRepository.save(link));
  }

  @Transactional
  public BatchSourceResponse updateBatchSource(
      UUID sourceId, UUID sourceBatchId, UUID targetBatchId, BigDecimal quantity, User user) {
    Organisation organisation = getActiveOrganisationForWriting(user);
    BatchSource source =
        batchSourceRepository
            .findById(sourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Batch source not found"));
    if (!organisation.getId().equals(source.getOrganisation().getId())) {
      throw new ResourceNotFoundException("Batch source not found");
    }
    Batch sourceBatch = getActiveBatch(sourceBatchId, organisation);
    Batch targetBatch = getActiveBatch(targetBatchId, organisation);
    if (sourceBatch.getId().equals(targetBatch.getId())) {
      throw new ResourceConflictException("A batch cannot source itself");
    }
    if (quantity == null
        || quantity.signum() <= 0
        || quantity.compareTo(sourceBatch.getQuantity()) > 0) {
      throw new ResourceConflictException(
          "Source quantity must be positive and not exceed batch quantity");
    }
    source.setSourceBatch(sourceBatch);
    source.setTargetBatch(targetBatch);
    source.setQuantity(quantity);
    return BatchSourceResponse.from(batchSourceRepository.save(source));
  }

  private void applyRequest(Batch batch, BatchRequest request) {
    batch.setName(request.name());
    batch.setStage(request.stage());
    batch.setQuantity(request.quantity());
    batch.setSpoiled(request.isSpoiled());
  }

  private void validateHarvestSource(Harvest harvest, BigDecimal quantity) {
    if (!harvest.isActive()) {
      throw new InactiveResourceException("Cannot use an inactive harvest");
    }
    if (quantity.compareTo(BigDecimal.valueOf(harvest.getAmountKg())) > 0) {
      throw new ResourceConflictException("Batch quantity cannot exceed the harvest quantity");
    }
  }

  private Batch getActiveBatch(UUID id, Organisation organisation) {
    Batch batch =
        batchRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));
    if (batch.isDeleted()) {
      throw new InactiveResourceException("Cannot access a deleted batch");
    }
    return batch;
  }

  private Organisation getActiveOrganisationForWriting(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.OENOLOGIST)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or oenologist can manage batches");
    }
    return organisation;
  }

  private Organisation getActiveOrganisationForReading(User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.OENOLOGIST)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or oenologist can access batches");
    }
    return organisation;
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
      throw new InactiveResourceException("Cannot access batches of an inactive organisation");
    }
    return organisation;
  }
}
