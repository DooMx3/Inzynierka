package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.dto.report.ReportRequest;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.ReportAggregation;
import com.github.DooMx3.inzynierka.enums.ReportType;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.ResourceConflictException;
import com.github.DooMx3.inzynierka.repositories.*;
import java.time.LocalDate;
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
import org.thymeleaf.spring6.SpringTemplateEngine;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
  @Mock private BatchRepository batchRepository;
  @Mock private BottlingRepository bottlingRepository;
  @Mock private HarvestRepository harvestRepository;
  @Mock private HarvestBatchRepository harvestBatchRepository;
  @Mock private FieldRepository fieldRepository;
  @Mock private SprayingRepository sprayingRepository;
  @Mock private PestObservationRepository pestObservationRepository;
  @Mock private TaskRepository taskRepository;
  @Mock private UserRepository userRepository;
  @Mock private SpringTemplateEngine templateEngine;

  @InjectMocks private ReportService service;

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
    when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
  }

  @Test
  void shouldRejectReversedReportPeriod() {
    ReportRequest request =
        new ReportRequest(
            LocalDate.of(2026, 12, 1),
            LocalDate.of(2026, 1, 1),
            Set.of(),
            Set.of(),
            Set.of(),
            ReportAggregation.MONTHLY);

    assertThrows(
        ResourceConflictException.class,
        () -> service.generate(ReportType.PRODUCTION_EFFICIENCY, request, owner));
  }

  @Test
  void shouldRequireAggregationForHistoricalTrendReport() {
    ReportRequest request = new ReportRequest(null, null, Set.of(), Set.of(), Set.of(), null);

    assertThrows(
        ResourceConflictException.class,
        () -> service.generate(ReportType.HISTORICAL_TRENDS, request, owner));
  }

  @Test
  void shouldGenerateReportHtmlWithoutPersistingIt() {
    ReportRequest request =
        new ReportRequest(null, null, Set.of(), Set.of(), Set.of(), ReportAggregation.MONTHLY);
    when(batchRepository.findByOrganisationAndDeletedFalseOrderByCreatedAtDescIdAsc(organisation))
        .thenReturn(java.util.List.of());
    when(fieldRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation))
        .thenReturn(java.util.List.of());
    when(templateEngine.process(any(String.class), any()))
        .thenReturn("<html><body>Report</body></html>");

    String html = service.generate(ReportType.PRODUCTION_EFFICIENCY, request, owner);

    assertEquals("<html><body>Report</body></html>", html);
  }
}
