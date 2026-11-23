package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.dto.offering.OfferingRequest;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Bottling;
import com.github.DooMx3.inzynierka.entities.Offering;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.BatchSourceRepository;
import com.github.DooMx3.inzynierka.repositories.BottlingRepository;
import com.github.DooMx3.inzynierka.repositories.HarvestBatchRepository;
import com.github.DooMx3.inzynierka.repositories.OfferingRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
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
class OfferingServiceTest {

  @Mock private OfferingRepository offeringRepository;
  @Mock private BottlingRepository bottlingRepository;
  @Mock private HarvestBatchRepository harvestBatchRepository;
  @Mock private BatchSourceRepository batchSourceRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private OfferingService service;

  private Organisation organisation;
  private User owner;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    owner =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OWNER)))
            .build();
  }

  @Test
  void ownerShouldCreateOfferingForOwnActiveBottling() {
    UUID wineId = UUID.randomUUID();
    Bottling wine = new Bottling();
    wine.setId(wineId);
    wine.setOrganisation(organisation);
    wine.setActive(true);
    Offering saved =
        Offering.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .wine(wine)
            .price(125)
            .build();

    when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
    when(bottlingRepository.findByIdAndOrganisation(wineId, organisation))
        .thenReturn(Optional.of(wine));
    when(offeringRepository.save(any(Offering.class))).thenReturn(saved);

    Offering result = service.create(new OfferingRequest(wineId, 125), owner);

    assertEquals(saved, result);
    verify(offeringRepository)
        .save(
            org.mockito.ArgumentMatchers.argThat(
                offering ->
                    offering.getOrganisation() == organisation
                        && offering.getWine() == wine
                        && offering.getPrice() == 125));
  }

  @Test
  void publicListShouldExcludeOfferingsFromInactiveOrganisations() {
    Organisation inactive = Organisation.builder().id(UUID.randomUUID()).active(false).build();
    Bottling wine = new Bottling();
    wine.setActive(true);
    Offering offering = Offering.builder().organisation(inactive).wine(wine).price(100).build();
    when(offeringRepository.findAll()).thenReturn(List.of(offering));

    assertEquals(List.of(), service.getAll());
  }

  @Test
  void publicGetShouldRejectMissingOffering() {
    UUID id = UUID.randomUUID();
    when(offeringRepository.findById(id)).thenReturn(Optional.empty());

    assertThrows(ResourceNotFoundException.class, () -> service.getById(id));
  }

  @Test
  void publicGetHistoryShouldReturnLinkedBatchHistory() {
    Batch batch = new Batch();
    batch.setId(UUID.randomUUID());
    batch.setName("Reserve batch");
    Bottling wine = new Bottling();
    wine.setBatch(batch);
    wine.setActive(true);
    Offering offering =
        Offering.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .wine(wine)
            .price(125)
            .build();
    when(offeringRepository.findById(offering.getId())).thenReturn(Optional.of(offering));
    when(harvestBatchRepository.findByBatch(batch)).thenReturn(List.of());
    when(batchSourceRepository.findByTargetBatch(batch)).thenReturn(List.of());
    when(batchSourceRepository.findBySourceBatch(batch)).thenReturn(List.of());

    BatchHistoryResponse history = service.getHistory(offering.getId());

    assertEquals(batch.getId(), history.batch().id());
    assertEquals(List.of(), history.harvestSources());
  }

  @Test
  void shouldRejectCreationByNonOwner() {
    User oenologist =
        User.builder()
            .id(UUID.randomUUID())
            .organisation(organisation)
            .roles(new HashSet<>(Set.of(RoleName.OENOLOGIST)))
            .build();
    when(userRepository.findById(oenologist.getId())).thenReturn(Optional.of(oenologist));

    assertThrows(
        InsufficientPermissionException.class,
        () -> service.create(new OfferingRequest(UUID.randomUUID(), 125), oenologist));
    verifyNoInteractions(bottlingRepository, offeringRepository);
  }
}
