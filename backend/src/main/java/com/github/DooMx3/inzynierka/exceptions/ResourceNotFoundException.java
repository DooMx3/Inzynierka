package com.github.DooMx3.inzynierka.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends DomainException {
  public ResourceNotFoundException(String message) {
    super(message);
  }
}
