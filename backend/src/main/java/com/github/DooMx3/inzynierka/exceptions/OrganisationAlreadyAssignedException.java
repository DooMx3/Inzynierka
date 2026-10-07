package com.github.DooMx3.inzynierka.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class OrganisationAlreadyAssignedException extends DomainException {

  public OrganisationAlreadyAssignedException(String message) {
    super(message);
  }
}
