package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.batch.BatchHistoryResponse;
import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.Bottling;
import com.github.DooMx3.inzynierka.entities.Offering;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.OfferingService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OfferingController.class)
@Import(TestSecurityConfig.class)
class OfferingControllerTest {

  private static final String BASE_URL = "/api/offerings";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private OfferingService offeringService;

  private User user;
  private Offering offering;
  private UUID offeringId;
  private UUID wineId;

  @BeforeEach
  void setUp() {
    user = new User();
    offeringId = UUID.randomUUID();
    wineId = UUID.randomUUID();
    Organisation organisation = Organisation.builder().id(UUID.randomUUID()).build();
    Bottling wine = new Bottling();
    wine.setId(wineId);
    wine.setName("Reserve");
    wine.setDescription("Dry red");
    offering =
        Offering.builder().id(offeringId).organisation(organisation).wine(wine).price(125).build();
  }

  @Test
  void guestShouldListOfferings() throws Exception {
    when(offeringService.getAll()).thenReturn(List.of(offering));

    mockMvc
        .perform(get(BASE_URL))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(offeringId.toString()))
        .andExpect(jsonPath("$[0].wineName").value("Reserve"))
        .andExpect(jsonPath("$[0].price").value(125));
  }

  @Test
  void guestShouldGetOfferingById() throws Exception {
    when(offeringService.getById(offeringId)).thenReturn(offering);

    mockMvc
        .perform(get(BASE_URL + "/" + offeringId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.wineId").value(wineId.toString()))
        .andExpect(jsonPath("$.price").value(125));
  }

  @Test
  void guestShouldGetOfferingHistory() throws Exception {
    Batch batch = new Batch();
    batch.setId(UUID.randomUUID());
    batch.setName("Reserve batch");
    BatchHistoryResponse history =
        new BatchHistoryResponse(
            com.github.DooMx3.inzynierka.dto.batch.BatchResponse.from(batch),
            List.of(),
            List.of(),
            List.of());
    when(offeringService.getHistory(offeringId)).thenReturn(history);

    mockMvc
        .perform(get(BASE_URL + "/" + offeringId + "/history"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.batch.id").value(batch.getId().toString()))
        .andExpect(jsonPath("$.harvestSources").isEmpty());

    verify(offeringService).getHistory(offeringId);
  }

  @Test
  void ownerShouldCreateOffering() throws Exception {
    when(offeringService.create(any(), eq(user))).thenReturn(offering);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"wineId":"%s","price":125}
                    """
                        .formatted(wineId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(offeringId.toString()));

    verify(offeringService).create(any(), eq(user));
  }

  @Test
  void shouldRejectNegativePrice() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(owner()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"wineId":"%s","price":-1}
                    """
                        .formatted(wineId)))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(offeringService);
  }

  @Test
  void shouldRejectNonOwner() throws Exception {
    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("OENOLOGIST")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"wineId":"%s","price":125}
                    """
                        .formatted(wineId)))
        .andExpect(status().isForbidden());

    verifyNoInteractions(offeringService);
  }

  private Authentication owner() {
    return authWith("OWNER");
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
