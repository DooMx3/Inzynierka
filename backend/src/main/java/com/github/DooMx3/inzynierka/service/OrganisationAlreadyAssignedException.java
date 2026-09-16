package com.github.DooMx3.inzynierka.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class OrganisationAlreadyAssignedException extends RuntimeException {

    public OrganisationAlreadyAssignedException(String message) {
        super(message);
    }
}
