package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.OrganisationService;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
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
    void shouldRejectOrganisationWithoutNameForAuthenticatedUserWithoutOwnerRole() throws Exception {
        User user = User.builder()
                .email("user@example.com")
                .roles(new HashSet<>())
                .build();

        mockMvc.perform(
                post("/api/organisations")
                        .with(authentication(authenticationFor(user)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "city": "Lublin"
                                }
                                """)
        ).andExpect(status().isBadRequest());
    }

    @Test
    void shouldCreateOrganisationForOwnerUser() throws Exception {
        User user = User.builder()
                .email("owner@example.com")
                .roles(new HashSet<>(Set.of(ownerRole())))
                .build();
        Organisation organisation = Organisation.builder()
                .name("Winnica Nad Wisłą")
                .city("Lublin")
                .active(true)
                .build();
        when(organisationService.createOrganisation(any(), any(User.class)))
                .thenReturn(organisation);

        mockMvc.perform(
                post("/api/organisations")
                        .with(authentication(authenticationFor(user)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Winnica Nad Wisłą",
                                  "city": "Lublin"
                                }
                                """)
        ).andExpect(status().isOk());

        verify(organisationService).createOrganisation(any(), any(User.class));
    }

    private static UsernamePasswordAuthenticationToken authenticationFor(User user) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                user.getAuthorities()
        );
    }

    private static Role ownerRole() {
        Role role = new Role();
        role.setName("OWNER");
        return role;
    }
}
