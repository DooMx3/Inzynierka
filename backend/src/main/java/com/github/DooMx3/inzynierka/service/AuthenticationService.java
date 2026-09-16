package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.user.AuthenticationRequest;
import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.InvitationStatus;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public void register(RegisterRequest request, HttpServletResponse response) {
        if(repository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }
        User user = User.builder()
                .firstname(request.firstname())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .membershipStatus(MembershipStatus.NONE)
                .invitationStatus(InvitationStatus.NONE)
                .active(true)
                .build();
        repository.save(user);

        String jwtToken = jwtService.generateToken(user);
        addJwtCookie(response, jwtToken);
    }

    public void authenticate(AuthenticationRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        var user = repository.findByEmail(request.email()).orElseThrow();

        String jwtToken = jwtService.generateToken(user);
        addJwtCookie(response, jwtToken);
    }

    private void addJwtCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(86400);

        response.addCookie(cookie);
    }
}