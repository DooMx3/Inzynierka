package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.report.ReportRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.ReportType;
import com.github.DooMx3.inzynierka.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Reports", description = "Generation and retrieval of organisation reports")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER')")
public class ReportController {
  private final ReportService reportService;

  @Operation(summary = "Generate report")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Report generated"),
    @ApiResponse(
        responseCode = "400",
        description = "Invalid report parameters",
        content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content)
  })
  @PostMapping("/{type}")
  public ResponseEntity<String> generate(
      @PathVariable ReportType type,
      @RequestBody @Valid ReportRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok()
        .contentType(MediaType.TEXT_HTML)
        .body(reportService.generate(type, request, user));
  }

  @Operation(summary = "Generate report PDF")
  @ApiResponses({
    @ApiResponse(
        responseCode = "200",
        description = "Report PDF generated",
        content = @Content(mediaType = "application/pdf")),
    @ApiResponse(
        responseCode = "400",
        description = "Invalid report parameters",
        content = @Content),
    @ApiResponse(responseCode = "401", description = "Not authenticated", content = @Content),
    @ApiResponse(
        responseCode = "403",
        description = "Organisation owner required",
        content = @Content)
  })
  @PostMapping("/{type}/pdf")
  public ResponseEntity<byte[]> generatePdf(
      @PathVariable ReportType type,
      @RequestBody @Valid ReportRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return pdfResponse(reportService.generatePdf(type, request, user), type.name());
  }

  private ResponseEntity<byte[]> pdfResponse(byte[] pdf, String title) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(
        ContentDisposition.attachment()
            .filename(title.replaceAll("[^a-zA-Z0-9.-]", "-") + ".pdf")
            .build());
    headers.setContentLength(pdf.length);
    return ResponseEntity.ok().headers(headers).body(pdf);
  }
}
