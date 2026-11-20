package com.github.DooMx3.inzynierka.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.github.DooMx3.inzynierka.config.TestSecurityConfig;
import com.github.DooMx3.inzynierka.dto.task.TaskResponse;
import com.github.DooMx3.inzynierka.dto.task.TaskTypeOption;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.enums.TaskStatus;
import com.github.DooMx3.inzynierka.enums.TaskType;
import com.github.DooMx3.inzynierka.enums.TaskType.RelationRequirement;
import com.github.DooMx3.inzynierka.service.JwtService;
import com.github.DooMx3.inzynierka.service.TaskService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({TaskController.class, TaskTypeController.class})
@Import(TestSecurityConfig.class)
class TaskControllerTest {

  private static final String BASE_URL = "/api/tasks";

  @Autowired private MockMvc mockMvc;
  @MockitoBean private JwtService jwtService;
  @MockitoBean private TaskService taskService;

  private User user;
  private UUID taskId;
  private TaskResponse response;

  @BeforeEach
  void setUp() {
    user = mock(User.class);
    taskId = UUID.randomUUID();
    response =
        new TaskResponse(
            taskId,
            TaskType.GENERAL,
            "Task",
            null,
            UUID.randomUUID(),
            RoleName.WORKER,
            UUID.randomUUID(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false);
  }

  @Test
  void shouldCreateListAndGetTasks() throws Exception {
    when(taskService.create(any(), eq(user))).thenReturn(response);
    when(taskService.getAll(TaskStatus.PLANNED, null, null, null, null, null, null, null, user))
        .thenReturn(List.of(response));
    when(taskService.getById(taskId, user)).thenReturn(response);

    mockMvc
        .perform(
            post(BASE_URL)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"GENERAL\",\"name\":\"Task\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("GENERAL"))
        .andExpect(jsonPath("$.completed").value(false));

    mockMvc
        .perform(get(BASE_URL).param("status", "PLANNED").with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(taskId.toString()));

    mockMvc
        .perform(get(BASE_URL + "/" + taskId).with(authentication(authWith("OENOLOGIST"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Task"));

    verify(taskService)
        .getAll(
            any(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(user));
  }

  @Test
  void shouldUpdateCompleteReopenAndDeleteTask() throws Exception {
    when(taskService.update(eq(taskId), any(), eq(user))).thenReturn(response);
    when(taskService.complete(taskId, user)).thenReturn(response);
    when(taskService.reopen(taskId, user)).thenReturn(response);

    mockMvc
        .perform(
            put(BASE_URL + "/" + taskId)
                .with(authentication(authWith("WORKER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"GENERAL\",\"name\":\"Updated task\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch(BASE_URL + "/" + taskId + "/complete").with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(patch(BASE_URL + "/" + taskId + "/reopen").with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk());

    mockMvc
        .perform(delete(BASE_URL + "/" + taskId).with(authentication(authWith("WORKER"))))
        .andExpect(status().isNoContent());
  }

  @Test
  void shouldReturnTaskTypeRelationRequirements() throws Exception {
    when(taskService.getTaskTypes(user))
        .thenReturn(
            List.of(
                new TaskTypeOption(
                    TaskType.SPRAYING,
                    RelationRequirement.REQUIRED,
                    RelationRequirement.OPTIONAL,
                    RelationRequirement.REQUIRED,
                    RelationRequirement.FORBIDDEN,
                    RelationRequirement.FORBIDDEN,
                    RelationRequirement.FORBIDDEN)));

    mockMvc
        .perform(get("/api/task-types").with(authentication(authWith("OWNER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].type").value("SPRAYING"))
        .andExpect(jsonPath("$[0].field").value("REQUIRED"))
        .andExpect(jsonPath("$[0].substance").value("REQUIRED"));
  }

  @Test
  void shouldRejectUsersWithoutTaskRole() throws Exception {
    mockMvc
        .perform(get(BASE_URL).with(authentication(authWith("GUEST"))))
        .andExpect(status().isForbidden());

    verifyNoInteractions(taskService);
  }

  private Authentication authWith(String... authorities) {
    return new UsernamePasswordAuthenticationToken(
        user, null, Stream.of(authorities).map(SimpleGrantedAuthority::new).toList());
  }
}
