package com.github.DooMx3.inzynierka.controller;

import com.github.DooMx3.inzynierka.dto.task.TaskTypeOption;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.service.TaskService;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER') or hasAuthority('WORKER') or hasAuthority('OENOLOGIST')")
public class TaskTypeController {

  private final TaskService taskService;

  @GetMapping("/api/task-types")
  public List<TaskTypeOption> getTaskTypes(
      @Parameter(hidden = true) @AuthenticationPrincipal User user) {
    return taskService.getTaskTypes(user);
  }
}
