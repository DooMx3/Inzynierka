package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrganisationController.class)
class OrganisationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrganisationService organisationService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    void shouldRejectOrganisationWithoutName() throws Exception {
        mockMvc.perform(
                post("/api/organisations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "city": "Lublin"
                                }
                                """)
        ).andExpect(status().isBadRequest());
    }
}