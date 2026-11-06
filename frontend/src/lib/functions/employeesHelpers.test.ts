import { describe, it, expect } from 'bun:test';
import { transformMembersAndInvitations, filterAndSortEmployees } from './employeesHelpers';
import type { Employee } from '$lib/types/employee';

describe('employeesHelpers', () => {
    it('transforms members and pending invitations into unified employees', () => {
        const members = [
            { id: '1', firstname: 'Jan', lastname: 'Kowalski', email: 'jan@example.com', roles: ['OWNER'], membershipStatus: 'ACTIVE' },
            { id: '2', firstname: 'Adam', lastname: 'Nowak', email: 'adam@example.com', roles: [], membershipStatus: 'PENDING' },
        ];
        const invitations = [
            { userId: '2', firstname: 'Adam', lastname: 'Nowak', email: 'adam@example.com', organisationId: 'org-1', organisationName: 'Org' },
            { userId: '3', firstname: 'Ewa', lastname: 'Zielińska', email: 'ewa@example.com', organisationId: 'org-1', organisationName: 'Org' },
        ];

        const employees = transformMembersAndInvitations(members, invitations);
        expect(employees).toHaveLength(3);
        expect(employees[0]).toEqual({
            id: '1',
            firstname: 'Jan',
            lastname: 'Kowalski',
            email: 'jan@example.com',
            roles: ['OWNER'],
            pending: false,
        });
        expect(employees[1].pending).toBe(true);
        expect(employees[2].email).toBe('ewa@example.com');
        expect(employees[2].pending).toBe(true);
    });

    it('filters and sorts employees correctly', () => {
        const employees: Employee[] = [
            { id: '1', firstname: 'Zosia', lastname: 'Nowak', email: 'zosia@example.com', roles: ['WORKER'], pending: false },
            { id: '2', firstname: 'Ala', lastname: 'Kowalska', email: 'ala@example.com', roles: [], pending: true },
            { id: '3', firstname: 'Bartek', lastname: 'Adamski', email: 'bartek@example.com', roles: ['OENOLOGIST'], pending: false },
        ];

        const sortedByName = filterAndSortEmployees(employees, '', 'all', 'name');
        expect(sortedByName[0].firstname).toBe('Bartek'); // Adamski
        expect(sortedByName[1].firstname).toBe('Ala'); // Kowalska
        expect(sortedByName[2].firstname).toBe('Zosia'); // Nowak

        const pendingOnly = filterAndSortEmployees(employees, '', 'pending', 'name');
        expect(pendingOnly).toHaveLength(1);
        expect(pendingOnly[0].id).toBe('2');

        const searchAla = filterAndSortEmployees(employees, 'ala', 'all', 'name');
        expect(searchAla).toHaveLength(1);
        expect(searchAla[0].firstname).toBe('Ala');
    });
});
