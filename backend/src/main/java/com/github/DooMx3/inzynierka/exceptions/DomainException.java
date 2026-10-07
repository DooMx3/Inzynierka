package com.github.DooMx3.inzynierka.exceptions;

public abstract class DomainException extends RuntimeException {
  public DomainException(String message) {
    super(message);
  }
}
