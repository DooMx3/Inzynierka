package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.record.RecordRequest;
import com.github.DooMx3.inzynierka.dto.record.RecordResponse;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Record;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.BatchRepository;
import com.github.DooMx3.inzynierka.repositories.RecordRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecordServiceTest {

  @Mock private RecordRepository recordRepository;
  @Mock private BatchRepository batchRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private RecordService service;

  private User owner;
  private Organisation organisation;
  private Batch batch;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    owner =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OWNER)))
            .build();
    batch = new Batch();
    batch.setId(UUID.randomUUID());
    batch.setOrganisation(organisation);
    lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
    lenient()
        .when(batchRepository.findByIdAndOrganisation(batch.getId(), organisation))
        .thenReturn(Optional.of(batch));
  }

  @Test
  void shouldCreateChemicalRecordLinkedToBatch() {
    Instant recordedAt = Instant.parse("2026-11-22T17:00:00Z");
    when(recordRepository.save(any(Record.class)))
        .thenAnswer(
            invocation -> {
              Record record = invocation.getArgument(0);
              record.setId(UUID.randomUUID());
              return record;
            });

    RecordResponse response =
        service.create(
            batch.getId(),
            new RecordRequest(
                recordedAt,
                new BigDecimal("215.00"),
                new BigDecimal("6.80"),
                new BigDecimal("3.35"),
                new BigDecimal("18.50"),
                new BigDecimal("0.00")),
            owner);

    assertEquals(batch.getId(), response.batchId());
    assertEquals(recordedAt, response.recordedAt());
    assertEquals(new BigDecimal("18.50"), response.temperature());
    verify(recordRepository)
        .save(
            argThat(
                record ->
                    record.getOrganisation() == organisation
                        && record.getBatch() == batch
                        && record.getTemperature().compareTo(new BigDecimal("18.50")) == 0));
  }

  @Test
  void shouldOnlyReturnRecordsForTheRequestedBatch() {
    Record record = new Record();
    record.setId(UUID.randomUUID());
    record.setOrganisation(organisation);
    record.setBatch(batch);
    record.setRecordedAt(Instant.parse("2026-11-22T17:00:00Z"));
    when(recordRepository.findByBatch_IdAndOrganisationAndActiveTrueOrderByRecordedAtDescIdAsc(
            batch.getId(), organisation))
        .thenReturn(List.of(record));

    List<RecordResponse> responses = service.getAll(batch.getId(), owner);

    assertEquals(List.of(record.getId()), responses.stream().map(RecordResponse::id).toList());
  }

  @Test
  void shouldUpdateRecordAndPreserveRecordedAtWhenNotProvided() {
    Instant recordedAt = Instant.parse("2026-11-22T17:00:00Z");
    Record record = new Record();
    record.setId(UUID.randomUUID());
    record.setOrganisation(organisation);
    record.setBatch(batch);
    record.setRecordedAt(recordedAt);
    when(recordRepository.findByIdAndBatch_IdAndOrganisationAndActiveTrue(
            record.getId(), batch.getId(), organisation))
        .thenReturn(Optional.of(record));
    when(recordRepository.save(record)).thenReturn(record);

    RecordResponse response =
        service.update(
            batch.getId(),
            record.getId(),
            new RecordRequest(
                null,
                null,
                new BigDecimal("6.60"),
                new BigDecimal("3.40"),
                new BigDecimal("19.00"),
                null),
            owner);

    assertEquals(recordedAt, response.recordedAt());
    assertEquals(new BigDecimal("6.60"), response.acidity());
    assertEquals(new BigDecimal("19.00"), response.temperature());
  }

  @Test
  void shouldRejectRecordThatDoesNotBelongToRequestedBatch() {
    UUID recordId = UUID.randomUUID();
    when(recordRepository.findByIdAndBatch_IdAndOrganisationAndActiveTrue(
            recordId, batch.getId(), organisation))
        .thenReturn(Optional.empty());

    assertThrows(
        ResourceNotFoundException.class, () -> service.getById(batch.getId(), recordId, owner));
  }

  @Test
  void shouldSoftDeleteRecord() {
    Record record = new Record();
    record.setId(UUID.randomUUID());
    record.setOrganisation(organisation);
    record.setBatch(batch);
    record.setActive(true);
    when(recordRepository.findByIdAndBatch_IdAndOrganisationAndActiveTrue(
            record.getId(), batch.getId(), organisation))
        .thenReturn(Optional.of(record));

    service.delete(batch.getId(), record.getId(), owner);

    assertFalse(record.isActive());
    verify(recordRepository).save(record);
  }
}
