package com.github.DooMx3.inzynierka.dto.user;

import jakarta.validation.constraints.Email;

public record UserPatchRequest(@Email String email, String phoneNumber) {}
