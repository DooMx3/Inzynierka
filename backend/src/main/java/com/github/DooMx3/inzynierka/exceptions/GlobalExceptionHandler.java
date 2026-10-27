package com.github.DooMx3.inzynierka.exceptions;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, String>> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex) {
    Map<String, String> body = new HashMap<>();
    body.put("error", "Invalid value for parameter: " + ex.getName());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
  }

  @ExceptionHandler(InactiveResourceException.class)
  public ResponseEntity<Map<String, String>> handleInactiveResource(InactiveResourceException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(InvalidLogoException.class)
  public ResponseEntity<Map<String, String>> handleInvalidLogo(InvalidLogoException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(LogoTooLargeException.class)
  public ResponseEntity<Map<String, String>> handleLogoTooLarge(LogoTooLargeException ex) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<Map<String, String>> handleMaxUploadSizeExceeded(
      MaxUploadSizeExceededException ex) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(Map.of("error", "Logo file must not exceed 2 MB"));
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<Map<String, String>> handlePageOrResourceNotFound(
      NoResourceFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(Map.of("error", "Resource not found: " + ex.getResourcePath()));
  }

  @ExceptionHandler({
    MissingServletRequestParameterException.class,
    MissingServletRequestPartException.class
  })
  public ResponseEntity<Map<String, String>> handleMissingRequestValue(Exception ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Required request value is missing"));
  }

  @ExceptionHandler(ResourceConflictException.class)
  public ResponseEntity<Map<String, String>> handleUserMembershipConflict(
      ResourceConflictException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(SelfInvitationException.class)
  public ResponseEntity<Map<String, String>> handleSelfInvitation(SelfInvitationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  public ResponseEntity<Map<String, String>> handleInvalidCredentials() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(Map.of("error", "Invalid credentials"));
  }

  @ExceptionHandler(BadCredentialsException.class)
  public ResponseEntity<Map<String, String>> handleBadCredentials() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(Map.of("error", "Invalid credentials"));
  }

  @ExceptionHandler(OrganisationAlreadyAssignedException.class)
  public ResponseEntity<Map<String, String>> handleOrganisationAlreadyAssigned(
      OrganisationAlreadyAssignedException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(AuthorizationDeniedException.class)
  public ResponseEntity<Map<String, String>> handleAuthorizationDenied(
      AuthorizationDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
  }

  @ExceptionHandler(InsufficientPermissionException.class)
  public ResponseEntity<Map<String, String>> handleInsufficientPermission(
      InsufficientPermissionException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<Map<String, String>> handleResourceNotFound(ResourceNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(ResourceAlreadyExistsException.class)
  public ResponseEntity<Map<String, String>> handleResourceAlreadyExists(
      ResourceAlreadyExistsException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(Map.of("error", "Malformed request body"));
  }

  @ExceptionHandler(DomainException.class)
  public ResponseEntity<String> handleDomainException(DomainException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Unexpected error"));
  }
}
