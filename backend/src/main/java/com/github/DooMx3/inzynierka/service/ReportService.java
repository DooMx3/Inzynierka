package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.report.ReportRequest;
import com.github.DooMx3.inzynierka.entities.*;
import com.github.DooMx3.inzynierka.enums.ReportAggregation;
import com.github.DooMx3.inzynierka.enums.ReportType;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.ResourceConflictException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.*;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import jakarta.transaction.Transactional;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
@RequiredArgsConstructor
public class ReportService {
  private final BatchRepository batchRepository;
  private final BottlingRepository bottlingRepository;
  private final HarvestRepository harvestRepository;
  private final HarvestBatchRepository harvestBatchRepository;
  private final FieldRepository fieldRepository;
  private final SprayingRepository sprayingRepository;
  private final PestObservationRepository pestObservationRepository;
  private final TaskRepository taskRepository;
  private final UserRepository userRepository;
  private final SpringTemplateEngine templateEngine;

  @Transactional
  public String generate(ReportType type, ReportRequest request, User user) {
    Organisation organisation = getActiveOrganisation(user);
    validateRequest(type, request);

    Map<String, Object> model =
        switch (type) {
          case PRODUCTION_EFFICIENCY -> productionEfficiency(request, organisation);
          case GRAPEVINE_DIVERSITY -> grapevineDiversity(request, organisation);
          case VINEYARD_OPERATIONS -> vineyardOperations(request, organisation);
          case HISTORICAL_TRENDS -> historicalTrends(request, organisation);
        };

    return templateEngine.process("report", new Context(Locale.ENGLISH, model));
  }

  @Transactional
  public byte[] generatePdf(ReportType type, ReportRequest request, User user) {
    return htmlToPdf(generate(type, request, user));
  }

  private Map<String, Object> productionEfficiency(
      ReportRequest request, Organisation organisation) {
    List<Batch> batches =
        batchRepository
            .findByOrganisationAndDeletedFalseOrderByCreatedAtDescIdAsc(organisation)
            .stream()
            .filter(batch -> inPeriod(batch.getCreatedAt(), request))
            .filter(
                batch -> request.batchIds().isEmpty() || request.batchIds().contains(batch.getId()))
            .toList();

    BigDecimal totalHarvestKg =
        batches.stream()
            .flatMap(batch -> harvestBatchRepository.findByBatch(batch).stream())
            .map(HarvestBatch::getQuantity)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal totalAreaHa =
        fieldRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation).stream()
            .map(Field::getAreaAre)
            .filter(Objects::nonNull)
            .map(area -> area.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal yieldPerHa =
        totalAreaHa.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : totalHarvestKg.divide(totalAreaHa, 2, RoundingMode.HALF_UP);

    long averageHarvestToBottlingDays = 0;
    int durationCount = 0;
    for (Batch batch : batches) {
      List<HarvestBatch> sources = harvestBatchRepository.findByBatch(batch);
      for (Bottling bottling : bottlingRepository.findByOrganisationAndActiveTrue(organisation)) {
        if (!bottling.getBatch().getId().equals(batch.getId())) continue;
        for (HarvestBatch source : sources) {
          LocalDate harvestDate = source.getHarvest().getHarvestDate();
          durationCount++;
          averageHarvestToBottlingDays +=
              ChronoUnit.DAYS.between(harvestDate, bottling.getBottledAt().toLocalDate());
        }
      }
    }
    double averageDays =
        durationCount == 0 ? 0 : (double) averageHarvestToBottlingDays / durationCount;
    BigDecimal spoiledPercent =
        batches.isEmpty()
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(batches.stream().filter(Batch::isSpoiled).count())
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(batches.size()), 2, RoundingMode.HALF_UP);

    List<Map<String, Object>> kpis =
        List.of(
            kpi("Yield per hectare", format(yieldPerHa) + " kg/ha"),
            kpi("Average harvest to bottling", format(BigDecimal.valueOf(averageDays)) + " days"),
            kpi("Spoiled batches", format(spoiledPercent) + "%"));
    List<List<Object>> rows =
        batches.stream()
            .map(
                batch ->
                    tableRow(
                        batch.getName() == null ? "-" : batch.getName(),
                        batch.getStage().name(),
                        format(batch.getQuantity()),
                        batch.isSpoiled() ? "Yes" : "No"))
            .toList();
    return baseModel(
        "Production Efficiency Report",
        request,
        kpis,
        section("Production Batches", List.of("Batch", "Stage", "Quantity", "Spoiled"), rows));
  }

  private Map<String, Object> grapevineDiversity(ReportRequest request, Organisation organisation) {
    List<Field> fields =
        fieldRepository.findByOrganisationAndActiveTrueOrderByIdAsc(organisation).stream()
            .filter(
                field -> request.fieldIds().isEmpty() || request.fieldIds().contains(field.getId()))
            .toList();
    Map<String, BigDecimal> areaByVariety = new TreeMap<>();
    Map<String, Integer> productionByVariety = new TreeMap<>();
    for (Field field : fields) {
      String variety = field.getGrapeVariety().getDisplayName();
      if (field.getGrapeVariety().name().equals("OTHER") && field.getOtherGrapeVariety() != null) {
        variety = field.getOtherGrapeVariety();
      }
      areaByVariety.merge(
          variety,
          field.getAreaAre() == null ? BigDecimal.ZERO : field.getAreaAre(),
          BigDecimal::add);

      int amount =
          harvestRepository
              .findDistinctByOrganisationAndFields_IdAndActiveTrueOrderByHarvestDateDescIdAsc(
                  organisation, field.getId())
              .stream()
              .filter(
                  harvest ->
                      inPeriod(
                          LocalDateTime.of(harvest.getHarvestDate(), LocalTime.MIDNIGHT), request))
              .mapToInt(Harvest::getAmountKg)
              .sum();
      productionByVariety.merge(variety, amount, Integer::sum);
    }
    int totalProduction = productionByVariety.values().stream().mapToInt(Integer::intValue).sum();
    List<List<Object>> rows =
        areaByVariety.entrySet().stream()
            .map(
                entry -> {
                  BigDecimal area = entry.getValue();
                  int production = productionByVariety.getOrDefault(entry.getKey(), 0);
                  BigDecimal contribution =
                      totalProduction == 0
                          ? BigDecimal.ZERO
                          : BigDecimal.valueOf(production)
                              .multiply(BigDecimal.valueOf(100))
                              .divide(BigDecimal.valueOf(totalProduction), 2, RoundingMode.HALF_UP);
                  return tableRow(
                      entry.getKey(),
                      format(area) + " are",
                      production + " kg",
                      format(contribution) + "%");
                })
            .toList();
    BigDecimal totalArea = areaByVariety.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    return baseModel(
        "Grapevine Diversity Report",
        request,
        List.of(
            kpi("Varieties", String.valueOf(areaByVariety.size())),
            kpi("Total area", format(totalArea) + " are"),
            kpi("Total production", totalProduction + " kg")),
        section(
            "Variety Distribution",
            List.of("Variety", "Area", "Production", "Contribution"),
            rows));
  }

  private Map<String, Object> vineyardOperations(ReportRequest request, Organisation organisation) {
    List<Map<String, Object>> operationRows = new ArrayList<>();
    for (Spraying spraying :
        sprayingRepository.findByOrganisationOrderBySprayingDateDesc(organisation)) {
      if (!inPeriod(spraying.getSprayingDate(), request) || spraying.getSprayingDate() == null)
        continue;
      if (!request.operationIds().isEmpty() && !request.operationIds().contains(spraying.getId()))
        continue;
      operationRows.add(
          row(
              "Spraying",
              spraying.getField().getId().toString(),
              1,
              spraying.getQuantity() + " " + spraying.getSubstance().getName()));
    }
    for (PestObservation observation :
        pestObservationRepository.findByOrganisationAndActiveTrueOrderByObservedAtDescIdAsc(
            organisation)) {
      if (!inPeriod(LocalDateTime.of(observation.getObservedAt(), LocalTime.MIDNIGHT), request))
        continue;
      if (!request.operationIds().isEmpty()
          && !request.operationIds().contains(observation.getId())) continue;
      operationRows.add(
          row("Pest control", observation.getField().getId().toString(), 1, observation.getName()));
    }
    for (Task task :
        taskRepository.findByOrganisationAndActiveTrueOrderByDueDateAscIdAsc(organisation)) {
      if (!inPeriod(task.getCompletedAt(), task.getDueDate(), request)) continue;
      if (!request.operationIds().isEmpty() && !request.operationIds().contains(task.getId()))
        continue;
      operationRows.add(
          row(
              task.getType().name(),
              task.getField() == null ? "-" : task.getField().getId().toString(),
              1,
              task.getName()));
    }
    Map<String, Integer> frequency = new HashMap<>();
    for (Map<String, Object> operation : operationRows) {
      String type = (String) operation.get("type");
      frequency.merge(type, (Integer) operation.get("frequency"), Integer::sum);
    }
    List<List<Object>> rows =
        operationRows.stream()
            .map(
                operation ->
                    Arrays.asList(
                        operation.get("type"),
                        operation.get("field"),
                        operation.get("frequency"),
                        operation.get("details")))
            .map(ReportService::tableRowFromArray)
            .toList();
    return baseModel(
        "Vineyard Operations Report",
        request,
        List.of(
            kpi("Operations", String.valueOf(operationRows.size())),
            kpi("Operation types", String.valueOf(frequency.size())),
            kpi("Period", periodText(request))),
        section(
            "Performed Operations", List.of("Operation", "Field", "Frequency", "Details"), rows));
  }

  private Map<String, Object> historicalTrends(ReportRequest request, Organisation organisation) {
    ReportAggregation aggregation =
        request.aggregation() == null ? ReportAggregation.MONTHLY : request.aggregation();
    List<Harvest> harvests =
        harvestRepository
            .findByOrganisationAndActiveTrueOrderByHarvestDateDescIdAsc(organisation)
            .stream()
            .filter(
                harvest ->
                    inPeriod(
                        LocalDateTime.of(harvest.getHarvestDate(), LocalTime.MIDNIGHT), request))
            .toList();
    Map<String, Integer> totals = new TreeMap<>();
    for (Harvest harvest : harvests) {
      String bucket = periodBucket(harvest.getHarvestDate(), aggregation);
      totals.merge(bucket, harvest.getAmountKg(), Integer::sum);
    }
    List<List<Object>> rows =
        totals.entrySet().stream()
            .map(entry -> tableRow(entry.getKey(), entry.getValue() + " kg"))
            .toList();
    int overall = totals.values().stream().mapToInt(Integer::intValue).sum();
    return baseModel(
        "Historical Trend Report",
        request,
        List.of(
            kpi("Aggregation", aggregation.name()),
            kpi("Production", overall + " kg"),
            kpi("Periods", String.valueOf(totals.size()))),
        section("Production Over Time", List.of("Period", "Harvested quantity"), rows));
  }

  private void validateRequest(ReportType type, ReportRequest request) {
    if (request == null) throw new ResourceConflictException("Report parameters are required");
    if (request.fromDate() != null
        && request.toDate() != null
        && request.fromDate().isAfter(request.toDate())) {
      throw new ResourceConflictException("From date cannot be after to date");
    }
    if (type == ReportType.HISTORICAL_TRENDS && request.aggregation() == null) {
      throw new ResourceConflictException("Aggregation is required for historical trend reports");
    }
  }

  private Map<String, Object> baseModel(
      String title,
      ReportRequest request,
      List<Map<String, Object>> kpis,
      Map<String, Object> section) {
    Map<String, Object> model = new HashMap<>();
    model.put("title", title);
    model.put("period", "Period: " + periodText(request));
    model.put("kpis", kpis);
    model.put("sections", List.of(section));
    return model;
  }

  private Map<String, Object> kpi(String label, String value) {
    Map<String, Object> kpi = new HashMap<>();
    kpi.put("label", label);
    kpi.put("value", value);
    return kpi;
  }

  private Map<String, Object> section(String title, List<?> headers, List<?> rows) {
    Map<String, Object> section = new HashMap<>();
    section.put("title", title);
    section.put("headers", headers);
    section.put("rows", rows);
    return section;
  }

  private Map<String, Object> row(String type, String field, int frequency, String details) {
    Map<String, Object> row = new HashMap<>();
    row.put("type", type);
    row.put("field", field);
    row.put("frequency", frequency);
    row.put("details", details);
    return row;
  }

  private static List<Object> tableRow(Object... values) {
    return Arrays.asList(values);
  }

  private static List<Object> tableRowFromArray(List<Object> values) {
    return values;
  }

  private boolean inPeriod(LocalDateTime date, ReportRequest request) {
    if (date == null) return false;
    LocalDate local = date.toLocalDate();
    return (request.fromDate() == null || !local.isBefore(request.fromDate()))
        && (request.toDate() == null || !local.isAfter(request.toDate()));
  }

  private boolean inPeriod(Instant date, ReportRequest request) {
    if (date == null) return false;
    return inPeriod(LocalDateTime.ofInstant(date, ZoneOffset.UTC), request);
  }

  private boolean inPeriod(LocalDate completed, LocalDate due, ReportRequest request) {
    LocalDate date = completed != null ? completed : due;
    if (date == null) return false;
    return (request.fromDate() == null || !date.isBefore(request.fromDate()))
        && (request.toDate() == null || !date.isAfter(request.toDate()));
  }

  private String periodBucket(LocalDate date, ReportAggregation aggregation) {
    return switch (aggregation) {
      case YEARLY -> String.valueOf(date.getYear());
      case QUARTERLY -> date.getYear() + "-Q" + ((date.getMonthValue() - 1) / 3 + 1);
      case MONTHLY -> date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
    };
  }

  private String periodText(ReportRequest request) {
    return (request.fromDate() == null ? "open start" : request.fromDate().toString())
        + " - "
        + (request.toDate() == null ? "open end" : request.toDate().toString());
  }

  private String format(BigDecimal value) {
    return value == null
        ? "0"
        : value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
  }

  private byte[] htmlToPdf(String html) {
    try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      PdfRendererBuilder builder = new PdfRendererBuilder();
      builder.useFastMode();
      builder.withHtmlContent(html, null);
      builder.toStream(output);
      builder.run();
      return output.toByteArray();
    } catch (Exception exception) {
      throw new IllegalStateException("Could not generate PDF", exception);
    }
  }

  private Organisation getActiveOrganisation(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }
    User authenticated =
        userRepository
            .findById(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    Organisation organisation = authenticated.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access reports of an inactive organisation");
    }
    if (!authenticated.getRoles().contains(RoleName.OWNER)) {
      throw new InsufficientPermissionException(
          "Only the organisation owner, worker or oenologist can access reports");
    }
    return organisation;
  }
}
