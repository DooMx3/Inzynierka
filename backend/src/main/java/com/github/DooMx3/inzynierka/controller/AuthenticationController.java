package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.user.AuthenticationRequest;
import com.github.DooMx3.inzynierka.dto.user.RegisterRequest;
import com.github.DooMx3.inzynierka.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication", description = "Authentication endpoints for user registration, login, and logout.")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService service;

    @Operation(
            summary = "Register new user and set HttpOnly cookie `jwt`.",
            description = "Registers a new user and sets an HttpOnly cookie `jwt` for authentication."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User registered successfully",
                    headers = @Header(name = "Set-Cookie", description = "jwt=...; HttpOnly; Path=/")),
            @ApiResponse(responseCode = "400", description = "Invalid data", content = @Content),
            @ApiResponse(responseCode = "409", description = "User already exists", content = @Content)
    })
    @PostMapping("/register")
    public ResponseEntity<String> register(
            @RequestBody @Valid RegisterRequest request,
            @Parameter(hidden = true) HttpServletResponse response
    ) {
        service.register(request, response);
        return ResponseEntity.ok("");
    }

    @Operation(
            summary = "Login and set HttpOnly cookie `jwt`.",
            description = "Verifies user credentials and sets an HttpOnly cookie `jwt` for authentication."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login successful, cookie set",
                    headers = @Header(name = "Set-Cookie", description = "jwt=...; HttpOnly; Path=/")),
            @ApiResponse(responseCode = "401", description = "Invalid credentials", content = @Content)
    })
    @PostMapping("/authenticate")
    public ResponseEntity<String> authenticate(
            @RequestBody AuthenticationRequest request,
            @Parameter(hidden = true) HttpServletResponse response
    ) {
        service.authenticate(request, response);
        return ResponseEntity.ok("");
    }

    @Operation(
            summary = "Logout",
            description = "Delete the `jwt` cookie to log out the user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cookie deleted")
    })
    @PostMapping("/logout")
    public ResponseEntity<String> logout(@Parameter(hidden = true) HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", null);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok("");
    }
}