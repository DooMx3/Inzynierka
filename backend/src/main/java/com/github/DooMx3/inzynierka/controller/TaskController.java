package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.task.TaskRequest;
import com.github.DooMx3.inzynierka.dto.task.TaskResponse;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.TaskStatus;
import com.github.DooMx3.inzynierka.enums.TaskType;
import com.github.DooMx3.inzynierka.service.TaskService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
public class TaskController {

  private final TaskService taskService;

  @PostMapping
  public ResponseEntity<TaskResponse> create(
      @RequestBody @Valid TaskRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(taskService.create(request, user));
  }

  @GetMapping
  public ResponseEntity<List<TaskResponse>> getAll(
      @RequestParam(required = false) TaskStatus status,
      @RequestParam(required = false) LocalDate dueBefore,
      @RequestParam(required = false) UUID assignedUserId,
      @RequestParam(required = false) UUID fieldId,
      @RequestParam(required = false) TaskType type,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(
        taskService.getAll(status, dueBefore, assignedUserId, fieldId, type, user));
  }

  @GetMapping("/{id}")
  public ResponseEntity<TaskResponse> getById(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(taskService.getById(id, user));
  }

  @PutMapping("/{id}")
  public ResponseEntity<TaskResponse> update(
      @PathVariable UUID id,
      @RequestBody @Valid TaskRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(taskService.update(id, request, user));
  }

  @PatchMapping("/{id}/complete")
  public ResponseEntity<TaskResponse> complete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(taskService.complete(id, user));
  }

  @PatchMapping("/{id}/reopen")
  public ResponseEntity<TaskResponse> reopen(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return ResponseEntity.ok(taskService.reopen(id, user));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @PathVariable UUID id, @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    taskService.delete(id, user);
    return ResponseEntity.noContent().build();
  }
}
