package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.OrganisationLogo;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.exceptions.InvalidLogoException;
import com.github.DooMx3.inzynierka.exceptions.LogoTooLargeException;
import com.github.DooMx3.inzynierka.repositories.OrganisationLogoRepository;
import com.github.DooMx3.inzynierka.repositories.OrganisationRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class OrganisationLogoServiceTest {

  @Mock private OrganisationService organisationService;

  @Mock private OrganisationRepository organisationRepository;

  @Mock private OrganisationLogoRepository organisationLogoRepository;

  @InjectMocks private OrganisationLogoService service;

  @Test
  void uploadsImageUsingItsDetectedContentType() throws Exception {
    UUID organisationId = UUID.randomUUID();
    User user = new User();
    Organisation organisation = new Organisation();
    organisation.setId(organisationId);
    organisation.setActive(true);
    when(organisationService.getOrganisation(user)).thenReturn(organisation);
    byte[] pngHeader = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
    MockMultipartFile file = new MockMultipartFile("file", "logo.png", "text/plain", pngHeader);

    service.upload(file, user);

    ArgumentCaptor<OrganisationLogo> logoCaptor = ArgumentCaptor.forClass(OrganisationLogo.class);
    verify(organisationLogoRepository).save(logoCaptor.capture());
    assertEquals(organisationId, logoCaptor.getValue().getOrganisationId());
    assertEquals("image/png", logoCaptor.getValue().getContentType());
    assertEquals(pngHeader.length, logoCaptor.getValue().getFileSize());
    assertEquals(OrganisationLogoService.LOGO_URL, organisation.getLogoPath());
    verify(organisationRepository).save(organisation);
  }

  @Test
  void rejectsFilesThatAreNotSupportedImages() {
    User user = new User();
    Organisation organisation = new Organisation();
    organisation.setId(UUID.randomUUID());
    organisation.setActive(true);
    when(organisationService.getOrganisation(user)).thenReturn(organisation);
    MockMultipartFile file =
        new MockMultipartFile("file", "logo.svg", "image/svg+xml", "<svg/>".getBytes());

    assertThrows(InvalidLogoException.class, () -> service.upload(file, user));

    verify(organisationLogoRepository, never()).save(any(OrganisationLogo.class));
  }

  @Test
  void rejectsFilesLargerThanTheConfiguredLimit() {
    User user = new User();
    Organisation organisation = new Organisation();
    organisation.setId(UUID.randomUUID());
    organisation.setActive(true);
    when(organisationService.getOrganisation(user)).thenReturn(organisation);
    byte[] oversizedImage = new byte[(int) OrganisationLogoService.MAX_FILE_SIZE + 1];
    MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", oversizedImage);

    assertThrows(LogoTooLargeException.class, () -> service.upload(file, user));

    verify(organisationLogoRepository, never()).save(any(OrganisationLogo.class));
  }
}
