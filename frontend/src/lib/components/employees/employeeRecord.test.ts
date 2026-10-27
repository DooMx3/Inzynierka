import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, afterEach } from 'bun:test';
import EmployeeRecord from './employeeRecord.svelte';
import type { Employee } from '$lib/types/employee';

const employee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 'member-1',
    firstname: 'Jane',
    lastname: 'Doe',
    email: 'jane.doe@example.com',
    roles: ['WORKER', 'OWNER'],
    pending: false,
    ...overrides,
});

const mountRow = (
    person: Employee,
    handlers: {
        onToggle?: () => void;
        onChangeRoles?: () => void;
        onRemove?: () => void;
    } = {},
) => {
    const table = document.createElement('table');
    const body = document.createElement('tbody');
    table.append(body);
    document.body.append(table);
    return render(EmployeeRecord, {
        target: body,
        props: { employee: person, ...handlers },
    });
};

describe('Employee record', () => {
    afterEach(() => {
        document.body.querySelectorAll('table').forEach((table) => table.remove());
    });

    it('shows a role label and its icon for every assigned role', () => {
        const { container } = mountRow(employee());

        expect(screen.getByText('Vineyard Worker')).toBeInTheDocument();
        expect(screen.getByText('Owner')).toBeInTheDocument();
        expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
        expect(container.querySelectorAll('.role-icon svg')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Change roles' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });

    it('shows the unassigned icon when a member has no role', () => {
        const { container } = mountRow(employee({ roles: [] }));

        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        expect(container.querySelector('.role-icon svg')).toBeInTheDocument();
    });

    it('shows a pending invitation without a role icon and offers removal', () => {
        const { container } = mountRow(employee({ roles: [], pending: true }));

        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByLabelText('Invitation pending')).toBeInTheDocument();
        expect(container.querySelector('.role-icon')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Change roles' })).not.toBeInTheDocument();
    });

    it('reports selection, role editing and invitation removal', async () => {
        let toggled = 0;
        let roles = 0;
        let removed = 0;
        mountRow(employee({ pending: true, roles: [] }), {
            onToggle: () => {
                toggled += 1;
            },
            onChangeRoles: () => {
                roles += 1;
            },
            onRemove: () => {
                removed += 1;
            },
        });

        await fireEvent.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));
        await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(toggled).toBe(1);
        expect(removed).toBe(1);
        expect(roles).toBe(0);
    });

    it('asks to change roles for an active member', async () => {
        let roles = 0;
        mountRow(employee(), {
            onChangeRoles: () => {
                roles += 1;
            },
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Change roles' }));

        expect(roles).toBe(1);
    });
});
