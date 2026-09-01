package com.github.DooMx3.inzynierka.entities;

public record RegisterRequest(
        String firstname,
        String email,
        String password
) {}
