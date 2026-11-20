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
  @JoinColumn(name = "organisationId", nullable = false)
  private Organisation organisation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "createdById", nullable = false)
  private User createdBy;

  @Enumerated(EnumType.STRING)
  @Column(name = "creatorRoleAtCreation", nullable = false, length = 16)
  private RoleName creatorRoleAtCreation;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assignedToId", nullable = false)
  private User assignedTo;

  @Enumerated(EnumType.STRING)
  @Column(name = "taskType", nullable = false, length = 32)
  private TaskType type;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(length = 2000)
  private String description;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "fieldId")
  private Field field;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "equipmentId")
  private Equipment equipment;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "substanceId")
  private Substance substance;

  @Column(name = "startedAt")
  private LocalDate startedAt;

  @Column(name = "completedAt")
  private LocalDate completedAt;

  @Column(name = "dueDate")
  private LocalDate dueDate;

  @Column(nullable = false)
  private boolean active = true;
}
