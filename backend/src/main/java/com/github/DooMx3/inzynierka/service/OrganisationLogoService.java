package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.organisation.OrganisationLogoContent;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.OrganisationLogo;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InvalidLogoException;
import com.github.DooMx3.inzynierka.exceptions.LogoTooLargeException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.repositories.OrganisationLogoRepository;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class OrganisationLogoService {

  public static final String LOGO_URL = "/api/organisations/logo";
  public static final long MAX_FILE_SIZE = 2 * 1024 * 1024;

  private final OrganisationService organisationService;
  private final OrganisationRepository organisationRepository;
  private final OrganisationLogoRepository organisationLogoRepository;

  @Transactional
  public void upload(MultipartFile file, User user) throws IOException {
    Organisation organisation = getActiveOrganisation(user);
    if (file == null || file.isEmpty()) {
      throw new InvalidLogoException("Logo file must not be empty");
    }
    if (file.getSize() > MAX_FILE_SIZE) {
      throw new LogoTooLargeException("Logo file must not exceed 2 MB");
    }

    byte[] imageData = file.getBytes();
    if (imageData.length > MAX_FILE_SIZE) {
      throw new LogoTooLargeException("Logo file must not exceed 2 MB");
    }

    String contentType = detectContentType(imageData);
    if (contentType == null) {
      throw new InvalidLogoException("Logo must be a PNG, JPEG, or WebP image");
    }

    UUID organisationId = organisation.getId();
    organisationLogoRepository.save(
        new OrganisationLogo(organisationId, contentType, imageData, imageData.length, null));
    organisation.setLogoPath(LOGO_URL);
    organisationRepository.save(organisation);
  }

  @Transactional(readOnly = true)
  public OrganisationLogoContent get(User user) {
    Organisation organisation = organisationService.getOrganisation(user);
    OrganisationLogo logo =
        organisationLogoRepository
            .findById(organisation.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Organisation logo not found"));
    return new OrganisationLogoContent(logo.getImageData(), logo.getContentType());
  }

  @Transactional
  public void delete(User user) {
    Organisation organisation = getActiveOrganisation(user);
    UUID organisationId = organisation.getId();
    if (!organisationLogoRepository.existsById(organisationId)) {
      throw new ResourceNotFoundException("Organisation logo not found");
    }
    organisationLogoRepository.deleteById(organisationId);
    organisation.setLogoPath(null);
    organisationRepository.save(organisation);
  }

  private Organisation getActiveOrganisation(User user) {
    Organisation organisation = organisationService.getOrganisation(user);
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot change the logo of an inactive organisation");
    }
    return organisation;
  }

  private String detectContentType(byte[] imageData) {
    if (imageData.length >= 8
        && imageData[0] == (byte) 0x89
        && imageData[1] == 0x50
        && imageData[2] == 0x4e
        && imageData[3] == 0x47
        && imageData[4] == 0x0d
        && imageData[5] == 0x0a
        && imageData[6] == 0x1a
        && imageData[7] == 0x0a) {
      return "image/png";
    }
    if (imageData.length >= 3
        && imageData[0] == (byte) 0xff
        && imageData[1] == (byte) 0xd8
        && imageData[2] == (byte) 0xff) {
      return "image/jpeg";
    }
    if (imageData.length >= 12
        && imageData[0] == 'R'
        && imageData[1] == 'I'
        && imageData[2] == 'F'
        && imageData[3] == 'F'
        && imageData[8] == 'W'
        && imageData[9] == 'E'
        && imageData[10] == 'B'
        && imageData[11] == 'P') {
      return "image/webp";
    }
    return null;
  }
}
