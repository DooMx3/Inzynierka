package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.organisation.OrganisationLogoContent;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.OrganisationLogoService;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

@WebMvcTest(OrganisationLogoController.class)
@Import(TestSecurityConfig.class)
class OrganisationLogoControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private JwtService jwtService;

  @MockitoBean private OrganisationLogoService organisationLogoService;

  private User user;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }

  @Test
  void getsImageWithDetectedContentType() throws Exception {
    byte[] image = {1, 2, 3};
    when(organisationLogoService.get(user))
        .thenReturn(new OrganisationLogoContent(image, "image/png"));

    mockMvc
        .perform(get(OrganisationLogoService.LOGO_URL).with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.IMAGE_PNG))
        .andExpect(content().bytes(image))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
  }

  @Test
  void uploadsMultipartFileWithPut() throws Exception {
    MockMultipartFile file =
        new MockMultipartFile("file", "logo.png", MediaType.IMAGE_PNG_VALUE, new byte[] {1});

    mockMvc
        .perform(
            multipart(OrganisationLogoService.LOGO_URL)
                .file(file)
                .with(
                    request -> {
                      request.setMethod("PUT");
                      return request;
                    })
                .with(authentication(authWith("OWNER"))))
        .andExpect(status().isNoContent());

    verify(organisationLogoService).upload(any(MultipartFile.class), eq(user));
  }

  @Test
  void rejectsNonOwnersBeforeCallingTheService() throws Exception {
    mockMvc
        .perform(get(OrganisationLogoService.LOGO_URL).with(authentication(authWith("MEMBER"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(organisationLogoService);
  }

  @Test
  void deletesLogo() throws Exception {
    mockMvc
        .perform(delete(OrganisationLogoService.LOGO_URL).with(authentication(authWith("OWNER"))))
        .andExpect(status().isNoContent());

    verify(organisationLogoService).delete(user);
  }
}
