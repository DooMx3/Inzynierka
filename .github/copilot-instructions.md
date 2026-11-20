# Repository instructions

## Task feature

When a change introduces a new type of task that can be managed by the Task feature, update the Task feature in the same change. Do not wait for a separate request to make the new type available there.

Before making changes, trace how task types are represented and used across the backend and frontend. Update every relevant part, such as the canonical type definition, API and persistence mapping, task creation and display, and any filters or forms. Follow the existing architecture and keep a single source of truth where possible.

Add or update focused tests for the new task type, then run the relevant checks. If it is unclear whether the new domain concept should be a task type, ask before making that product decision.
