package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Role;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    void shouldReturnOnlyAllowlistedUserInfo() throws Exception {
        Role role = new Role();
        role.setName("USER");
        role.setDescription("Internal role description");

        Organisation organisation = Organisation.builder()
                .name("Private organisation")
                .taxId("123456789")
                .build();

        User user = User.builder()
                .id(UUID.randomUUID())
                .membershipStatus(MembershipStatus.MEMBER)
                .firstname("Adam")
                .lastname("Nowak")
                .phoneNumber("123456789")
                .email("adam@example.com")
                .password("$2a$10$stored-password-hash")
                .active(true)
                .roles(Set.of(role))
                .organisation(organisation)
                .build();

        mockMvc.perform(get("/api/user/info")
                        .with(authentication(new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                user.getAuthorities()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId().toString()))
                .andExpect(jsonPath("$.membershipStatus").value("MEMBER"))
                .andExpect(jsonPath("$.firstname").value("Adam"))
                .andExpect(jsonPath("$.lastname").value("Nowak"))
                .andExpect(jsonPath("$.phoneNumber").value("123456789"))
                .andExpect(jsonPath("$.email").value("adam@example.com"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.roles[0]").value("USER"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.organisation").doesNotExist())
                .andExpect(jsonPath("$.authorities").doesNotExist())
                .andExpect(jsonPath("$.accountNonExpired").doesNotExist())
                .andExpect(jsonPath("$.accountNonLocked").doesNotExist())
                .andExpect(jsonPath("$.credentialsNonExpired").doesNotExist())
                .andExpect(jsonPath("$.enabled").doesNotExist())
                .andExpect(jsonPath("$.username").doesNotExist());
    }
}
