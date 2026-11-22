package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.record.RecordRequest;
import com.github.DooMx3.inzynierka.dto.record.RecordResponse;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Record;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.BatchRepository;
import com.github.DooMx3.inzynierka.repositories.RecordRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RecordService {

  private final RecordRepository recordRepository;
  private final BatchRepository batchRepository;
  private final UserRepository userRepository;

  @Transactional
  public RecordResponse create(UUID batchId, RecordRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    Batch batch = getActiveBatch(batchId, organisation);
    Record record = new Record();
    record.setOrganisation(organisation);
    record.setBatch(batch);
    applyRequest(record, request, true);
    return RecordResponse.from(recordRepository.save(record));
  }

  @Transactional
  public List<RecordResponse> getAll(UUID batchId, User user) {
    Organisation organisation = getActiveOrganisation(user);
    getActiveBatch(batchId, organisation);
    return recordRepository
        .findByBatch_IdAndOrganisationAndActiveTrueOrderByRecordedAtDescIdAsc(batchId, organisation)
        .stream()
        .map(RecordResponse::from)
        .toList();
  }

  @Transactional
  public RecordResponse getById(UUID batchId, UUID recordId, User user) {
    Organisation organisation = getActiveOrganisation(user);
    getActiveBatch(batchId, organisation);
    return RecordResponse.from(getActiveRecord(recordId, batchId, organisation));
  }

  @Transactional
  public RecordResponse update(UUID batchId, UUID recordId, RecordRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    getActiveBatch(batchId, organisation);
    Record record = getActiveRecord(recordId, batchId, organisation);
    applyRequest(record, request, false);
    return RecordResponse.from(recordRepository.save(record));
  }

  @Transactional
  public void delete(UUID batchId, UUID recordId, User user) {
    Organisation organisation = getActiveOrganisation(user);
    getActiveBatch(batchId, organisation);
    Record record = getActiveRecord(recordId, batchId, organisation);
    record.setActive(false);
    recordRepository.save(record);
  }

  private void applyRequest(Record record, RecordRequest request, boolean creating) {
    if (creating || request.recordedAt() != null) {
      record.setRecordedAt(request.recordedAt() == null ? Instant.now() : request.recordedAt());
    }
    record.setSugarLevel(request.sugarLevel());
    record.setAcidity(request.acidity());
    record.setPh(request.ph());
    record.setTemperature(request.temperature());
    record.setAlcoholContent(request.alcoholContent());
  }

  private Record getActiveRecord(UUID recordId, UUID batchId, Organisation organisation) {
    return recordRepository
        .findByIdAndBatch_IdAndOrganisationAndActiveTrue(recordId, batchId, organisation)
        .orElseThrow(() -> new ResourceNotFoundException("Record not found"));
  }

  private Batch getActiveBatch(UUID batchId, Organisation organisation) {
    Batch batch =
        batchRepository
            .findByIdAndOrganisation(batchId, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));
    if (batch.isDeleted()) {
      throw new InactiveResourceException("Cannot access records for a deleted batch");
    }
    return batch;
  }

  private Organisation getActiveOrganisation(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }
    User authenticatedUser =
        userRepository
            .findById(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    Organisation organisation = authenticatedUser.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access records of an inactive organisation");
    }
    if (!authenticatedUser.getRoles().contains(RoleName.OWNER)
        && !authenticatedUser.getRoles().contains(RoleName.OENOLOGIST)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner or oenologist can manage records");
    }
    return organisation;
  }
}
