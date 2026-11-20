package com.github.DooMx3.inzynierka.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.github.DooMx3.inzynierka.dto.task.TaskRequest;
import com.github.DooMx3.inzynierka.dto.task.TaskResponse;
import com.github.DooMx3.inzynierka.entities.Equipment;
import com.github.DooMx3.inzynierka.entities.Field;
import com.github.DooMx3.inzynierka.entities.Organisation;
import com.github.DooMx3.inzynierka.entities.Substance;
import com.github.DooMx3.inzynierka.entities.Task;
import com.github.DooMx3.inzynierka.entities.User;
import com.github.DooMx3.inzynierka.enums.MembershipStatus;
import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.enums.TaskType;
import com.github.DooMx3.inzynierka.enums.TaskType.RelationRequirement;
import com.github.DooMx3.inzynierka.exceptions.InsufficientPermissionException;
import com.github.DooMx3.inzynierka.exceptions.InvalidTaskRequestException;
import com.github.DooMx3.inzynierka.repositories.EquipmentRepository;
import com.github.DooMx3.inzynierka.repositories.FieldRepository;
import com.github.DooMx3.inzynierka.repositories.SubstanceRepository;
import com.github.DooMx3.inzynierka.repositories.TaskRepository;
import com.github.DooMx3.inzynierka.repositories.UserRepository;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

  @Mock private TaskRepository taskRepository;
  @Mock private UserRepository userRepository;
  @Mock private FieldRepository fieldRepository;
  @Mock private EquipmentRepository equipmentRepository;
  @Mock private SubstanceRepository substanceRepository;
  @InjectMocks private TaskService service;

  private Organisation organisation;
  private User worker;
  private User owner;
  private Field field;
  private Equipment equipment;
  private Substance substance;

  @BeforeEach
  void setUp() {
    organisation = Organisation.builder().id(UUID.randomUUID()).active(true).build();
    worker = user(RoleName.WORKER);
    owner = user(RoleName.OWNER);
    field = new Field();
    field.setId(UUID.randomUUID());
    field.setOrganisation(organisation);
    field.setActive(true);
    equipment = new Equipment();
    equipment.setId(UUID.randomUUID());
    equipment.setOrganisation(organisation);
    equipment.setActive(true);
    substance = new Substance();
    substance.setId(UUID.randomUUID());
    substance.setOrganisation(organisation);
    substance.setActive(true);
    lenient().when(userRepository.findById(worker.getId())).thenReturn(Optional.of(worker));
    lenient().when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
    lenient()
        .when(fieldRepository.findByIdAndOrganisation(field.getId(), organisation))
        .thenReturn(Optional.of(field));
    lenient()
        .when(equipmentRepository.findByIdAndOrganisation(equipment.getId(), organisation))
        .thenReturn(Optional.of(equipment));
    lenient()
        .when(substanceRepository.findByIdAndOrganisation(substance.getId(), organisation))
        .thenReturn(Optional.of(substance));
    lenient()
        .when(taskRepository.save(any(Task.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void shouldCreateSprayingTaskWithRequiredFieldAndSubstance() {
    TaskResponse response =
        service.create(
            request(TaskType.SPRAYING, field.getId(), null, substance.getId(), worker.getId()),
            worker);

    assertEquals(TaskType.SPRAYING, response.type());
    assertEquals(field.getId(), response.fieldId());
    assertEquals(substance.getId(), response.substanceId());
    assertEquals(worker.getId(), response.createdById());
    assertEquals(RoleName.WORKER, response.creatorRoleAtCreation());
  }

  @Test
  void shouldRejectMissingOrForbiddenRelationsForTaskType() {
    assertThrows(
        InvalidTaskRequestException.class,
        () -> service.create(request(TaskType.SPRAYING, field.getId(), null, null, null), worker));
    assertThrows(
        InvalidTaskRequestException.class,
        () ->
            service.create(
                request(TaskType.HARVEST, field.getId(), null, substance.getId(), null), worker));
    verify(taskRepository, never()).save(any());
  }

  @Test
  void shouldAllowOwnerToEditWorkerTaskAndRejectWorkerEditingOwnerTask() {
    Task workerTask = task(worker, RoleName.WORKER);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(workerTask.getId(), organisation))
        .thenReturn(Optional.of(workerTask));

    TaskResponse response =
        service.update(
            workerTask.getId(), request(TaskType.GENERAL, null, null, null, null), owner);
    assertEquals(workerTask.getId(), response.id());

    Task ownerTask = task(owner, RoleName.OWNER);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(ownerTask.getId(), organisation))
        .thenReturn(Optional.of(ownerTask));
    assertThrows(
        InsufficientPermissionException.class,
        () ->
            service.update(
                ownerTask.getId(), request(TaskType.GENERAL, null, null, null, null), worker));
  }

  @Test
  void shouldAllowWorkerToDeleteWorkerTaskAndHideItAfterDeletion() {
    Task task = task(worker, RoleName.WORKER);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(task.getId(), organisation))
        .thenReturn(Optional.of(task));

    service.delete(task.getId(), worker);

    assertFalse(task.isActive());
    verify(taskRepository).save(task);
  }

  @Test
  void shouldCompleteAndReopenTaskWithoutLosingItsStartDate() {
    Task task = task(worker, RoleName.WORKER);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(task.getId(), organisation))
        .thenReturn(Optional.of(task));

    TaskResponse completed = service.complete(task.getId(), worker);
    LocalDate startedAt = completed.startedAt();
    assertTrue(completed.completed());
    assertNotNull(completed.completedAt());
    assertNotNull(startedAt);

    TaskResponse reopened = service.reopen(task.getId(), worker);
    assertFalse(reopened.completed());
    assertNull(reopened.completedAt());
    assertEquals(startedAt, reopened.startedAt());
  }

  @Test
  void shouldAllowAssignedWorkerToCompleteOwnerTaskButRejectUnassignedWorker() {
    Task ownerTask = task(owner, RoleName.OWNER);
    ownerTask.setAssignedTo(worker);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(ownerTask.getId(), organisation))
        .thenReturn(Optional.of(ownerTask));

    TaskResponse completed = service.complete(ownerTask.getId(), worker);
    assertTrue(completed.completed());

    Task unassignedTask = task(owner, RoleName.OWNER);
    unassignedTask.setAssignedTo(owner);
    when(taskRepository.findByIdAndOrganisationAndActiveTrue(unassignedTask.getId(), organisation))
        .thenReturn(Optional.of(unassignedTask));
    assertThrows(
        InsufficientPermissionException.class,
        () -> service.complete(unassignedTask.getId(), worker));
  }

  @Test
  void shouldExposeRelationRulesForEveryTaskType() {
    var options = service.getTaskTypes();

    assertEquals(5, options.size());
    assertEquals(
        RelationRequirement.REQUIRED,
        options.stream()
            .filter(option -> option.type() == TaskType.SPRAYING)
            .findFirst()
            .orElseThrow()
            .field());
    assertEquals(
        RelationRequirement.REQUIRED,
        options.stream()
            .filter(option -> option.type() == TaskType.SPRAYING)
            .findFirst()
            .orElseThrow()
            .substance());
    assertEquals(
        RelationRequirement.FORBIDDEN,
        options.stream()
            .filter(option -> option.type() == TaskType.HARVEST)
            .findFirst()
            .orElseThrow()
            .substance());
    assertEquals(
        RelationRequirement.REQUIRED,
        options.stream()
            .filter(option -> option.type() == TaskType.EQUIPMENT_MAINTENANCE)
            .findFirst()
            .orElseThrow()
            .equipment());
    assertEquals(
        RelationRequirement.OPTIONAL,
        options.stream()
            .filter(option -> option.type() == TaskType.GENERAL)
            .findFirst()
            .orElseThrow()
            .substance());
  }

  @Test
  void shouldAllowOwnerToAssignWorkerButRejectWorkerAssigningAnotherUser() {
    TaskResponse response =
        service.create(request(TaskType.GENERAL, null, null, null, worker.getId()), owner);
    assertEquals(worker.getId(), response.assignedUserId());

    assertThrows(
        InsufficientPermissionException.class,
        () -> service.create(request(TaskType.GENERAL, null, null, null, owner.getId()), worker));
  }

  private TaskRequest request(
      TaskType type, UUID fieldId, UUID equipmentId, UUID substanceId, UUID assigneeId) {
    return new TaskRequest(
        type,
        "  Task title  ",
        "  Description  ",
        assigneeId,
        fieldId,
        equipmentId,
        substanceId,
        LocalDate.of(2026, 11, 20),
        LocalDate.of(2026, 11, 21));
  }

  private User user(RoleName role) {
    return User.builder()
        .id(UUID.randomUUID())
        .organisation(organisation)
        .membershipStatus(MembershipStatus.MEMBER)
        .roles(EnumSet.of(role))
        .active(true)
        .build();
  }

  private Task task(User creator, RoleName creatorRole) {
    Task task = new Task();
    task.setId(UUID.randomUUID());
    task.setOrganisation(organisation);
    task.setCreatedBy(creator);
    task.setCreatorRoleAtCreation(creatorRole);
    task.setAssignedTo(worker);
    task.setType(TaskType.GENERAL);
    task.setName("Task");
    task.setActive(true);
    return task;
  }
}
