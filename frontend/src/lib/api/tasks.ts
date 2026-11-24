import { toApiError } from '$lib/api/auth';

const jsonHeaders = {
    'Content-Type': 'application/json',
};

export type TaskType =
    | 'GENERAL'
    | 'SPRAYING'
    | 'HARVEST'
    | 'FIELD_WORK'
    | 'EQUIPMENT_MAINTENANCE';

export type TaskStatus = 'PLANNED' | 'COMPLETED';

export type RelationRequirement = 'REQUIRED' | 'OPTIONAL' | 'FORBIDDEN';

export type TaskTypeOption = {
    type: TaskType;
    field: RelationRequirement;
    equipment: RelationRequirement;
    substance: RelationRequirement;
    batch: RelationRequirement;
    bottling: RelationRequirement;
    record: RelationRequirement;
};

export type TaskItem = {
    id: string;
    type: TaskType;
    name: string;
    description: string;
    createdById: string;
    creatorRoleAtCreation: string;
    assignedUserId: string;
    fieldId: string | null;
    equipmentId: string | null;
    substanceId: string | null;
    batchId: string | null;
    bottlingId: string | null;
    recordId: string | null;
    startedAt: string | null;
    completedAt: string | null;
    dueDate: string | null;
    completed: boolean;
};

export type TaskDraft = {
    type: TaskType;
    name: string;
    description?: string | null;
    assignedUserId?: string | null;
    fieldId?: string | null;
    equipmentId?: string | null;
    substanceId?: string | null;
    batchId?: string | null;
    bottlingId?: string | null;
    recordId?: string | null;
    startedAt?: string | null;
    dueDate?: string | null;
};

export type TaskQueryFilters = {
    status?: TaskStatus;
    dueBefore?: string;
    assignedUserId?: string;
    fieldId?: string;
    batchId?: string;
    bottlingId?: string;
    recordId?: string;
    type?: TaskType;
};

export const TASK_TYPES: TaskType[] = [
    'GENERAL',
    'SPRAYING',
    'HARVEST',
    'FIELD_WORK',
    'EQUIPMENT_MAINTENANCE',
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
    GENERAL: 'General',
    SPRAYING: 'Spraying',
    HARVEST: 'Harvest',
    FIELD_WORK: 'Field work',
    EQUIPMENT_MAINTENANCE: 'Equipment maintenance',
};

export const DEFAULT_TASK_TYPE_OPTIONS: TaskTypeOption[] = [
    {
        type: 'GENERAL',
        field: 'OPTIONAL',
        equipment: 'OPTIONAL',
        substance: 'OPTIONAL',
        batch: 'OPTIONAL',
        bottling: 'OPTIONAL',
        record: 'OPTIONAL',
    },
    {
        type: 'SPRAYING',
        field: 'REQUIRED',
        equipment: 'OPTIONAL',
        substance: 'REQUIRED',
        batch: 'FORBIDDEN',
        bottling: 'FORBIDDEN',
        record: 'FORBIDDEN',
    },
    {
        type: 'HARVEST',
        field: 'REQUIRED',
        equipment: 'OPTIONAL',
        substance: 'FORBIDDEN',
        batch: 'FORBIDDEN',
        bottling: 'FORBIDDEN',
        record: 'FORBIDDEN',
    },
    {
        type: 'FIELD_WORK',
        field: 'REQUIRED',
        equipment: 'OPTIONAL',
        substance: 'FORBIDDEN',
        batch: 'FORBIDDEN',
        bottling: 'FORBIDDEN',
        record: 'FORBIDDEN',
    },
    {
        type: 'EQUIPMENT_MAINTENANCE',
        field: 'FORBIDDEN',
        equipment: 'REQUIRED',
        substance: 'FORBIDDEN',
        batch: 'FORBIDDEN',
        bottling: 'FORBIDDEN',
        record: 'FORBIDDEN',
    },
];

const ensureOk = async (response: Response) => {
    if (!response.ok) {
        throw await toApiError(response);
    }
};

const readNullableString = (val: unknown): string | null =>
    typeof val === 'string' && val.trim().length > 0 ? val : null;

const readRequirement = (val: unknown): RelationRequirement => {
    if (val === 'REQUIRED' || val === 'FORBIDDEN') {
        return val;
    }
    return 'OPTIONAL';
};

const readTaskType = (val: unknown): TaskType => {
    if (typeof val === 'string' && TASK_TYPES.includes(val as TaskType)) {
        return val as TaskType;
    }
    return 'GENERAL';
};

export const readTask = (data: unknown): TaskItem => {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const completedAt = readNullableString(record.completedAt);
    return {
        id: typeof record.id === 'string' ? record.id : '',
        type: readTaskType(record.type),
        name: typeof record.name === 'string' ? record.name : '',
        description: typeof record.description === 'string' ? record.description : '',
        createdById: typeof record.createdById === 'string' ? record.createdById : '',
        creatorRoleAtCreation:
            typeof record.creatorRoleAtCreation === 'string' ? record.creatorRoleAtCreation : '',
        assignedUserId: typeof record.assignedUserId === 'string' ? record.assignedUserId : '',
        fieldId: readNullableString(record.fieldId),
        equipmentId: readNullableString(record.equipmentId),
        substanceId: readNullableString(record.substanceId),
        batchId: readNullableString(record.batchId),
        bottlingId: readNullableString(record.bottlingId),
        recordId: readNullableString(record.recordId),
        startedAt: readNullableString(record.startedAt),
        completedAt,
        dueDate: readNullableString(record.dueDate),
        completed: typeof record.completed === 'boolean' ? record.completed : Boolean(completedAt),
    };
};

const serializeDraft = (draft: TaskDraft) => {
    const clean = (v?: string | null) => (v && v.trim().length > 0 ? v.trim() : undefined);
    return JSON.stringify({
        type: draft.type,
        name: draft.name.trim(),
        description: clean(draft.description),
        assignedUserId: clean(draft.assignedUserId),
        fieldId: clean(draft.fieldId),
        equipmentId: clean(draft.equipmentId),
        substanceId: clean(draft.substanceId),
        batchId: clean(draft.batchId),
        bottlingId: clean(draft.bottlingId),
        recordId: clean(draft.recordId),
        startedAt: clean(draft.startedAt),
        dueDate: clean(draft.dueDate),
    });
};

export const isTaskOverdue = (
    task: Pick<TaskItem, 'completed' | 'dueDate'>,
    todayIso: string = new Date().toISOString().slice(0, 10),
): boolean => {
    if (task.completed || !task.dueDate) {
        return false;
    }
    return task.dueDate.slice(0, 10) < todayIso;
};

export const getTasks = async (filters: TaskQueryFilters = {}): Promise<TaskItem[]> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            params.set(key, value);
        }
    }
    const query = params.toString();
    const response = await fetch(query ? `/api/tasks?${query}` : '/api/tasks', {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map(readTask).filter((item) => Boolean(item.id));
};

export const getTaskById = async (id: string): Promise<TaskItem> => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include',
    });
    await ensureOk(response);
    return readTask(await response.json());
};

export const createTask = async (draft: TaskDraft): Promise<TaskItem> => {
    const response = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readTask(await response.json());
};

export const updateTask = async (id: string, draft: TaskDraft): Promise<TaskItem> => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: jsonHeaders,
        body: serializeDraft(draft),
    });
    await ensureOk(response);
    return readTask(await response.json());
};

export const completeTask = async (id: string): Promise<TaskItem> => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
        method: 'PATCH',
        credentials: 'include',
    });
    await ensureOk(response);
    return readTask(await response.json());
};

export const reopenTask = async (id: string): Promise<TaskItem> => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/reopen`, {
        method: 'PATCH',
        credentials: 'include',
    });
    await ensureOk(response);
    return readTask(await response.json());
};

export const deleteTask = async (id: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    await ensureOk(response);
};

export const getTaskTypes = async (): Promise<TaskTypeOption[]> => {
    try {
        const response = await fetch('/api/task-types', {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) {
            return DEFAULT_TASK_TYPE_OPTIONS;
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            return DEFAULT_TASK_TYPE_OPTIONS;
        }
        const parsed = data.flatMap((item): TaskTypeOption[] => {
            if (!item || typeof item !== 'object') {
                return [];
            }
            const record = item as Record<string, unknown>;
            if (typeof record.type !== 'string' || !TASK_TYPES.includes(record.type as TaskType)) {
                return [];
            }
            return [
                {
                    type: record.type as TaskType,
                    field: readRequirement(record.field),
                    equipment: readRequirement(record.equipment),
                    substance: readRequirement(record.substance),
                    batch: readRequirement(record.batch),
                    bottling: readRequirement(record.bottling),
                    record: readRequirement(record.record),
                },
            ];
        });
        return parsed.length > 0 ? parsed : DEFAULT_TASK_TYPE_OPTIONS;
    } catch {
        return DEFAULT_TASK_TYPE_OPTIONS;
    }
};
