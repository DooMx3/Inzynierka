package com.github.DooMx3.inzynierka.service;

import com.github.DooMx3.inzynierka.dto.task.TaskRequest;
import com.github.DooMx3.inzynierka.dto.task.TaskResponse;
import com.github.DooMx3.inzynierka.dto.task.TaskTypeOption;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.Task;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.enums.TaskStatus;
import com.github.DooMx3.inzynierka.enums.TaskType;
import com.github.DooMx3.inzynierka.enums.TaskType.RelationRequirement;
import com.github.DooMx3.inzynierka.exceptions.InactiveResourceException;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.InvalidTaskRequestException;
import com.github.DooMx3.inzynierka.exceptions.ResourceNotFoundException;
import com.github.DooMx3.inzynierka.exceptions.UnauthorizedException;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.TaskRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TaskService {

  private final TaskRepository taskRepository;
  private final UserRepository userRepository;
  private final FieldRepository fieldRepository;
  private final EquipmentRepository equipmentRepository;
  private final SubstanceRepository substanceRepository;

  @Transactional
  public TaskResponse create(TaskRequest request, User user) {
    User creator = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(creator);
    RoleName creatorRole = getTaskRole(creator);

    Task task = new Task();
    task.setOrganisation(organisation);
    task.setCreatedBy(creator);
    task.setCreatorRoleAtCreation(creatorRole);
    applyRequest(task, request, creator, organisation, true);
    return TaskResponse.from(taskRepository.save(task));
  }

  @Transactional
  public List<TaskResponse> getAll(
      TaskStatus status,
      LocalDate dueBefore,
      UUID assignedUserId,
      UUID fieldId,
      TaskType type,
      User user) {
    User authenticatedUser = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(authenticatedUser);
    return taskRepository
        .findByOrganisationAndActiveTrueOrderByDueDateAscIdAsc(organisation)
        .stream()
        .filter(task -> status == null || matchesStatus(task, status))
        .filter(
            task ->
                dueBefore == null
                    || (task.getDueDate() != null && !task.getDueDate().isAfter(dueBefore)))
        .filter(
            task -> assignedUserId == null || assignedUserId.equals(task.getAssignedTo().getId()))
        .filter(
            task ->
                fieldId == null
                    || (task.getField() != null && fieldId.equals(task.getField().getId())))
        .filter(task -> type == null || type == task.getType())
        .map(TaskResponse::from)
        .toList();
  }

  @Transactional
  public TaskResponse getById(UUID id, User user) {
    Organisation organisation = getActiveOrganisation(getAuthenticatedUser(user));
    return TaskResponse.from(getTask(id, organisation));
  }

  @Transactional
  public TaskResponse update(UUID id, TaskRequest request, User user) {
    User actor = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(actor);
    Task task = getTask(id, organisation);
    requireEditPermission(task, actor);
    applyRequest(task, request, actor, organisation, false);
    return TaskResponse.from(taskRepository.save(task));
  }

  @Transactional
  public TaskResponse complete(UUID id, User user) {
    User actor = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(actor);
    Task task = getTask(id, organisation);
    requireStatusPermission(task, actor);
    LocalDate today = LocalDate.now();
    if (task.getStartedAt() == null) {
      task.setStartedAt(today);
    }
    task.setCompletedAt(today);
    return TaskResponse.from(taskRepository.save(task));
  }

  @Transactional
  public TaskResponse reopen(UUID id, User user) {
    User actor = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(actor);
    Task task = getTask(id, organisation);
    requireStatusPermission(task, actor);
    task.setCompletedAt(null);
    return TaskResponse.from(taskRepository.save(task));
  }

  @Transactional
  public void delete(UUID id, User user) {
    User actor = getAuthenticatedUser(user);
    Organisation organisation = getActiveOrganisation(actor);
    Task task = getTask(id, organisation);
    requireEditPermission(task, actor);
    task.setActive(false);
    taskRepository.save(task);
  }

  public List<TaskTypeOption> getTaskTypes() {
    return Arrays.stream(TaskType.values()).map(TaskTypeOption::from).toList();
  }

  private void applyRequest(
      Task task, TaskRequest request, User actor, Organisation organisation, boolean creating) {
    validateTypeRelations(request);

    task.setType(request.type());
    task.setName(request.name().trim());
    task.setDescription(
        request.description() == null || request.description().isBlank()
            ? null
            : request.description().trim());
    task.setStartedAt(request.startedAt());
    task.setDueDate(request.dueDate());
    task.setField(resolveField(request.fieldId(), organisation));
    task.setEquipment(resolveEquipment(request.equipmentId(), organisation));
    task.setSubstance(resolveSubstance(request.substanceId(), organisation));
    task.setAssignedTo(
        resolveAssignee(request.assignedUserId(), actor, organisation, task, creating));
  }

  private void validateTypeRelations(TaskRequest request) {
    validateRelation("fieldId", request.fieldId(), request.type().fieldRequirement());
    validateRelation("equipmentId", request.equipmentId(), request.type().equipmentRequirement());
    validateRelation("substanceId", request.substanceId(), request.type().substanceRequirement());
  }

  private void validateRelation(String fieldName, UUID value, RelationRequirement requirement) {
    if (requirement == RelationRequirement.REQUIRED && value == null) {
      throw new InvalidTaskRequestException(fieldName + " is required for this task type");
    }
    if (requirement == RelationRequirement.FORBIDDEN && value != null) {
      throw new InvalidTaskRequestException(fieldName + " is not allowed for this task type");
    }
  }

  private User resolveAssignee(
      UUID requestedId, User actor, Organisation organisation, Task task, boolean creating) {
    UUID assigneeId = requestedId;
    if (assigneeId == null && !creating) {
      assigneeId = task.getAssignedTo().getId();
    }
    if (assigneeId == null) {
      assigneeId = actor.getId();
    }
    if (!actor.getRoles().contains(RoleName.OWNER) && !assigneeId.equals(actor.getId())) {
      if (creating || !assigneeId.equals(task.getAssignedTo().getId())) {
        throw new InsufficientPermissionException(
            "Only the organisation owner can assign tasks to another user");
      }
    }
    User assignee =
        userRepository
            .findById(assigneeId)
            .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found"));
    if (assignee.getOrganisation() == null
        || !organisation.getId().equals(assignee.getOrganisation().getId())
        || assignee.getMembershipStatus() != MembershipStatus.MEMBER
        || !assignee.isActive()) {
      throw new ResourceNotFoundException("Assigned user not found");
    }
    return assignee;
  }

  private Field resolveField(UUID id, Organisation organisation) {
    if (id == null) {
      return null;
    }
    Field field =
        fieldRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Field not found"));
    if (!field.isActive()) {
      throw new InactiveResourceException("Cannot use an inactive field");
    }
    return field;
  }

  private Equipment resolveEquipment(UUID id, Organisation organisation) {
    if (id == null) {
      return null;
    }
    Equipment equipment =
        equipmentRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Equipment not found"));
    if (!equipment.isActive()) {
      throw new InactiveResourceException("Cannot use inactive equipment");
    }
    return equipment;
  }

  private Substance resolveSubstance(UUID id, Organisation organisation) {
    if (id == null) {
      return null;
    }
    Substance substance =
        substanceRepository
            .findByIdAndOrganisation(id, organisation)
            .orElseThrow(() -> new ResourceNotFoundException("Substance not found"));
    if (!substance.isActive()) {
      throw new InactiveResourceException("Cannot use an inactive substance");
    }
    return substance;
  }

  private Task getTask(UUID id, Organisation organisation) {
    return taskRepository
        .findByIdAndOrganisationAndActiveTrue(id, organisation)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
  }

  private void requireEditPermission(Task task, User actor) {
    if (actor.getRoles().contains(RoleName.OWNER)) {
      return;
    }
    if (actor.getRoles().contains(task.getCreatorRoleAtCreation())) {
      return;
    }
    throw new InsufficientPermissionException(
        "Only an owner or a user with the task creator's role can modify this task");
  }

  private void requireStatusPermission(Task task, User actor) {
    if (actor.getRoles().contains(RoleName.OWNER)
        || task.getAssignedTo().getId().equals(actor.getId())) {
      return;
    }
    throw new InsufficientPermissionException(
        "Only the organisation owner or the assigned user can change task completion");
  }

  private boolean matchesStatus(Task task, TaskStatus status) {
    return status == TaskStatus.COMPLETED
        ? task.getCompletedAt() != null
        : task.getCompletedAt() == null;
  }

  private User getAuthenticatedUser(User user) {
    if (user == null || user.getId() == null) {
      throw new UnauthorizedException("Authenticated user is required");
    }
    User authenticatedUser =
        userRepository
            .findById(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    if (!authenticatedUser.isActive()) {
      throw new InsufficientPermissionException("Inactive users cannot access tasks");
    }
    getTaskRole(authenticatedUser);
    return authenticatedUser;
  }

  private RoleName getTaskRole(User user) {
    if (user.getRoles().contains(RoleName.OWNER)) {
      return RoleName.OWNER;
    }
    if (user.getRoles().contains(RoleName.WORKER)) {
      return RoleName.WORKER;
    }
    if (user.getRoles().contains(RoleName.OENOLOGIST)) {
      return RoleName.OENOLOGIST;
    }
    throw new InsufficientPermissionException(
        "Only organisation owners, workers and oenologists can access tasks");
  }

  private Organisation getActiveOrganisation(User user) {
    Organisation organisation = user.getOrganisation();
    if (organisation == null) {
      throw new InsufficientPermissionException("User is not a member of an organisation");
    }
    if (!organisation.isActive()) {
      throw new InactiveResourceException("Cannot access tasks of an inactive organisation");
    }
    return organisation;
  }
}
