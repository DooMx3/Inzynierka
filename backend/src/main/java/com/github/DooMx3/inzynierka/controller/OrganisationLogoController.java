package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationLogoContent;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.OrganisationLogoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Organisation logo", description = "Upload and retrieve an organisation logo")
@SecurityRequirement(name = "cookieAuth")
@RestController
@RequestMapping(OrganisationLogoService.LOGO_URL)
@RequiredArgsConstructor
public class OrganisationLogoController {

  private final OrganisationLogoService organisationLogoService;

  @Operation(summary = "Upload or replace the organisation logo")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Logo uploaded"),
    @ApiResponse(
        responseCode = "400",
        description = "Invalid image",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "401",
        description = "Not authenticated",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "403",
        description = "Owner access required",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "413",
        description = "Image exceeds 2 MB",
        content = @io.swagger.v3.oas.annotations.media.Content)
  })
  @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> upload(
      @RequestPart("file") MultipartFile file, @AuthenticationPrincipal User user)
      throws IOException {
    organisationLogoService.upload(file, user);
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Get the organisation logo")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "Image returned"),
    @ApiResponse(
        responseCode = "401",
        description = "Not authenticated",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "403",
        description = "Owner access required",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "404",
        description = "Logo not found",
        content = @io.swagger.v3.oas.annotations.media.Content)
  })
  @GetMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<byte[]> get(@AuthenticationPrincipal User user) {
    OrganisationLogoContent logo = organisationLogoService.get(user);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(logo.contentType()))
        .contentLength(logo.imageData().length)
        .cacheControl(CacheControl.noStore())
        .header("X-Content-Type-Options", "nosniff")
        .body(logo.imageData());
  }

  @Operation(summary = "Delete the organisation logo")
  @ApiResponses({
    @ApiResponse(responseCode = "204", description = "Logo deleted"),
    @ApiResponse(
        responseCode = "401",
        description = "Not authenticated",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "403",
        description = "Owner access required",
        content = @io.swagger.v3.oas.annotations.media.Content),
    @ApiResponse(
        responseCode = "404",
        description = "Logo not found",
        content = @io.swagger.v3.oas.annotations.media.Content)
  })
  @DeleteMapping
  @PreAuthorize("hasAuthority('OWNER')")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal User user) {
    organisationLogoService.delete(user);
    return ResponseEntity.noContent().build();
  }
}
