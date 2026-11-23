package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchResponse;
import com.github.DooMx3.inzynierka.dto.batch.BatchSourceResponse;
import com.github.DooMx3.inzynierka.dto.batch.HarvestBatchResponse;
import com.github.DooMx3.inzynierka.dto.offering.OfferingRequest;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Bottling;
import com.github.DooMx3.inzynierka.entities.Offering;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.BatchSourceRepository;
import com.github.DooMx3.inzynierka.repositories.BottlingRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestBatchRepository;
import com.github.DooMx3.inzynierka.repositories.OfferingRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OfferingService {

  private final OfferingRepository offeringRepository;
  private final BottlingRepository bottlingRepository;
  private final HarvestBatchRepository harvestBatchRepository;
  private final BatchSourceRepository batchSourceRepository;
  private final UserRepository userRepository;

  @Transactional
  public Offering create(OfferingRequest request, User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOwnedOrganisation(authenticatedUser);

    Bottling wine =
        bottlingRepository
            .findByIdAndOrganisation(request.wineId(), organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Wine bottling not found"));
    if (!wine.isActive()) {
      throw new InactiveResourceException("Cannot offer an inactive wine bottling");
    }

    Offering offering =
        Offering.builder().organisation(organisation).wine(wine).price(request.price()).build();
    return offeringRepository.save(offering);
  }

  @Transactional
  public List<Offering> getAll() {
    return offeringRepository.findAll().stream()
        .filter(
            offering ->
                offering.getOrganisation() != null
                    && offering.getOrganisation().isActive()
                    && offering.getWine() != null
                    && offering.getWine().isActive())
        .toList();
  }

  @Transactional
  public Offering getById(UUID id) {
    Offering offering =
        offeringRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Offering not found"));
    if (!offering.getOrganisation().isActive()) {
      throw new InactiveResourceException("Cannot access an inactive organisation offering");
    }
    if (!offering.getWine().isActive()) {
      throw new InactiveResourceException("Cannot access an inactive wine offering");
    }
    return offering;
  }

  @Transactional
  public BatchHistoryResponse getHistory(UUID id) {
    Offering offering = getById(id);
    Batch batch = offering.getWine().getBatch();
    if (batch == null) {
      throw new ResourceNotFoundException("Offering batch history not found");
    }
    if (batch.isDeleted()) {
      throw new InactiveResourceException("Cannot access history of a deleted batch");
    }

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

  private Organisation getActiveOwnedOrganisation(User authenticatedUser) {
    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot create offerings for an inactive organisation");
    }
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException("Only the organisation owner can create offerings");
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
}
