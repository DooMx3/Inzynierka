package com.github.DooMx3.inzynierka.entities;

public record RegisterRequest(
        String firstName,
        String lastName,
        String phoneNumber,
        String email,
        String password
) {}
