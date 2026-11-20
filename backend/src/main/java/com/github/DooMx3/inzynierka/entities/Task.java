package com.github.DooMx3.inzynierka.entities;

import com.github.DooMx3.inzynierka.enums.RoleName;
import com.github.DooMx3.inzynierka.enums.TaskType;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "task")
@Data
public class Task {
  @Id
  @GeneratedValue
  @UuidGenerator(style = UuidGenerator.Style.TIME)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organisation_id", nullable = false)
  private Organisation organisation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by_id", nullable = false)
  private User createdBy;

  @Enumerated(EnumType.STRING)
  @Column(name = "creator_role_at_creation", nullable = false, length = 16)
  private RoleName creatorRoleAtCreation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assigned_to_id", nullable = false)
  private User assignedTo;

  @Enumerated(EnumType.STRING)
  @Column(name = "task_type", nullable = false, length = 32)
  private TaskType type;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(length = 2000)
  private String description;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "field_id")
  private Field field;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "equipment_id")
  private Equipment equipment;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "substance_id")
  private Substance substance;

  @Column(name = "started_at")
  private LocalDate startedAt;

  @Column(name = "completed_at")
  private LocalDate completedAt;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(nullable = false)
  private boolean active = true;
}
