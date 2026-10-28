<script lang="ts">
    import closeIcon from "$lib/assets/close.svg?raw";
    import editIcon from "$lib/assets/edit.svg?raw";
    import workerIcon from "$lib/assets/worker.svg?raw";
    import oenologistIcon from "$lib/assets/oenologist.svg?raw";
    import unassignedIcon from "$lib/assets/unassigned.svg?raw";
    import vineryIcon from "$lib/assets/vinery.svg?raw";
    import Button from "$lib/components/buttons/button.svelte";
    import { roleLabel, type Employee } from "$lib/types/employee";

    const iconForRole = (role: string) =>
        role === "WORKER" ? workerIcon : role === "OENOLOGIST" ? oenologistIcon : vineryIcon;

    let {
        employee,
        selected = false,
        onToggle = () => {},
        onChangeRoles = () => {},
        onRemove = () => {},
    }: {
        employee: Employee;
        selected?: boolean;
        onToggle?: () => void;
        onChangeRoles?: () => void;
        onRemove?: () => void;
    } = $props();

    const badges = $derived(
        employee.pending
            ? [{ label: "Pending", tone: "bg-[#8c735c] text-white", icon: "" }]
            : employee.roles.length === 0
              ? [{ label: "Unassigned", tone: "border border-[#c4b6a6] bg-white text-zinc-700", icon: unassignedIcon }]
              : employee.roles.map((role) => ({
                    label: roleLabel(role),
                    icon: iconForRole(role),
                    tone:
                        role === "WORKER"
                            ? "bg-[#6b4f3a] text-white"
                            : role === "OENOLOGIST"
                              ? "bg-[#8c735c] text-white"
                              : "bg-[#3f2e22] text-white",
                })),
    );
</script>

<style>
    @reference "../../../app.css";

    .role-icon :global(svg) {
        width: 1rem;
        height: 1rem;
        fill: currentColor;
    }

    .role-icon :global(svg *) {
        fill: currentColor;
    }
</style>


<tr class="border-t border-[#e4d8cb] even:bg-[#efe6dc]">
    <td class="px-4 py-3">
        <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${employee.firstname} ${employee.lastname}`}
            onchange={() => onToggle()}
        />
    </td>
    <td class="px-4 py-3">{employee.firstname}</td>
    <td class="px-4 py-3">{employee.lastname}</td>
    <td class="px-4 py-3">{employee.email}</td>
    <td class="px-4 py-3">
        <div class="flex flex-wrap gap-2">
            {#each badges as badge (badge.label)}
                <span
                    class={[
                        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-center text-xs font-medium",
                        badge.tone,
                    ]}
                >
                    {#if badge.icon}
                        <span class="role-icon" aria-hidden="true">{@html badge.icon}</span>
                    {/if}
                    {badge.label}
                </span>
            {/each}
        </div>
    </td>
    <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
            {#if employee.pending}
                <span
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#8c735c] text-white"
                    aria-label="Invitation pending"
                    title="Invitation pending"
                >
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v5l3 2" />
                    </svg>
                </span>
                <div class="w-36">
                    <Button
                        svg={closeIcon}
                        text="Remove"
                        isFolded={false}
                        gentle={true}
                        class="bg-[#8f3d32] text-white fill-white"
                        onClick={onRemove}
                    />
                </div>
            {:else}
                <div class="w-44">
                    <Button
                        svg={editIcon}
                        text="Change roles"
                        isFolded={false}
                        gentle={true}
                        class="bg-[#6b4f3a] text-white fill-white"
                        onClick={onChangeRoles}
                    />
                </div>
                {#if !employee.roles.includes("OWNER")}
                    <div class="w-36">
                        <Button
                            svg={closeIcon}
                            text="Remove"
                            isFolded={false}
                            gentle={true}
                            class="bg-[#8f3d32] text-white fill-white"
                            onClick={onRemove}
                        />
                    </div>
                {/if}
            {/if}
        </div>
    </td>
</tr>
