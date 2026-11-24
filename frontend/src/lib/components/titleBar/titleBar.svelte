<script lang="ts">
    import logo from "$lib/assets/logo.webp";
    import loginIcon from "$lib/assets/login.svg?raw";
    import TasksHeaderButton from "../buttons/tasksHeaderButton.svelte";
    import ProfileMenu from "../profileMenu/profileMenu.svelte";
    import SearchField from "../searchField/searchField.svelte";
    import { menu, toggleMenu } from "$lib/stores/menu.svelte";
    import { session } from "$lib/stores/session.svelte";
    import { MediaQuery } from "svelte/reactivity";

    type QuickNavEntry = {
        label: string;
        section: string;
        path: string;
        keywords: string;
        roles?: string[];
    };

    const QUICK_NAV_DIRECTORY: QuickNavEntry[] = [
        {
            label: "Dashboard",
            section: "Home",
            path: "/",
            keywords: "home overview start summary",
        },
        {
            label: "Profile",
            section: "Account",
            path: "/profile",
            keywords: "account password email vineyard membership settings",
        },
        {
            label: "Tasks",
            section: "Operations",
            path: "/tasks",
            keywords: "todo assignments schedule work",
            roles: ["OWNER", "WORKER", "OENOLOGIST"],
        },
        {
            label: "Fields",
            section: "Field work",
            path: "/agriculture/fields",
            keywords: "plots grapes varieties area agriculture",
            roles: ["OWNER", "WORKER"],
        },
        {
            label: "Harvests",
            section: "Field work",
            path: "/agriculture/harvests",
            keywords: "picking yield grapes agriculture",
            roles: ["OWNER", "WORKER"],
        },
        {
            label: "Spraying",
            section: "Field work",
            path: "/agriculture/spraying",
            keywords: "treatments protection pesticides agriculture",
            roles: ["OWNER", "WORKER"],
        },
        {
            label: "Pests",
            section: "Field work",
            path: "/agriculture/pests",
            keywords: "diseases insects monitoring agriculture",
            roles: ["OWNER", "WORKER"],
        },
        {
            label: "Must",
            section: "Vinery",
            path: "/vinery/must",
            keywords: "pressing juice batches production vinery",
            roles: ["OWNER", "OENOLOGIST"],
        },
        {
            label: "Fermenting",
            section: "Vinery",
            path: "/vinery/fermenting",
            keywords: "yeast alcohol sugar parameters vinery",
            roles: ["OWNER", "OENOLOGIST"],
        },
        {
            label: "Aged wine",
            section: "Vinery",
            path: "/vinery/aged",
            keywords: "barrels maturation clarifying vinery",
            roles: ["OWNER", "OENOLOGIST"],
        },
        {
            label: "Blended wine",
            section: "Vinery",
            path: "/vinery/blended",
            keywords: "cuvee mixing batches vinery",
            roles: ["OWNER", "OENOLOGIST"],
        },
        {
            label: "Bottled wine",
            section: "Packed products",
            path: "/packed-products",
            keywords: "bottles packed products labels",
            roles: ["OWNER", "OENOLOGIST"],
        },
        {
            label: "Equipment",
            section: "Management",
            path: "/management/equipment",
            keywords: "tanks barrels machines presses management",
            roles: ["OWNER"],
        },
        {
            label: "Substances",
            section: "Management",
            path: "/management/substances",
            keywords: "chemicals sprays catalogue management",
            roles: ["OWNER"],
        },
        {
            label: "Ingredients",
            section: "Management",
            path: "/management/ingredients",
            keywords: "nutrients additives yeast sugar management",
            roles: ["OWNER"],
        },
        {
            label: "Offerings",
            section: "Management",
            path: "/management/offerings",
            keywords: "catalog wines prices photos public link management",
            roles: ["OWNER"],
        },
        {
            label: "QR Codes",
            section: "Management",
            path: "/management/qr-codes",
            keywords: "qr labels print scan bottle equipment management",
            roles: ["OWNER"],
        },
        {
            label: "Vineyard Settings",
            section: "Management",
            path: "/management/vineyard",
            keywords: "organisation vineyard name logo delete management",
            roles: ["OWNER"],
        },
        {
            label: "Raports",
            section: "Analytics",
            path: "/raports",
            keywords: "reports analytics kpi summary export",
            roles: ["OWNER"],
        },
        {
            label: "Workers",
            section: "Organisation",
            path: "/workers",
            keywords: "team employees members roles invite",
            roles: ["OWNER"],
        },
    ];

    const VINEYARD_ROLES = ["OWNER", "WORKER", "OENOLOGIST"] as const;

    let search = $state("");
    let searchDismissedFor = $state<string | null>(null);

    const mobile = new MediaQuery("max-width: 640px");
    const showSearch = $derived(!mobile.current && session.user !== null);

    const hasVineyardRole = $derived(
        Boolean(
            session.user?.roles?.some((role) =>
                VINEYARD_ROLES.includes(role as (typeof VINEYARD_ROLES)[number]),
            ),
        ),
    );

    const availableDestinations = $derived.by(() => {
        if (!session.user) {
            return [];
        }
        const userRoles = session.user.roles ?? [];
        return QUICK_NAV_DIRECTORY.filter(
            (entry) =>
                !entry.roles || entry.roles.some((role) => userRoles.includes(role)),
        );
    });

    const filteredDestinations = $derived.by(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) {
            return [];
        }
        return availableDestinations
            .filter((entry) =>
                `${entry.label} ${entry.section} ${entry.keywords} ${entry.path}`
                    .toLowerCase()
                    .includes(needle),
            )
            .slice(0, 6);
    });

    const isDropdownOpen = $derived(
        showSearch && search.trim().length > 0 && searchDismissedFor !== search,
    );

    const navigateTo = (path: string) => {
        searchDismissedFor = search;
        window.location.href = path;
    };

    const handleSearchKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && isDropdownOpen) {
            event.stopPropagation();
            searchDismissedFor = search;
            return;
        }
        if (event.key === "Enter" && filteredDestinations.length > 0) {
            event.preventDefault();
            navigateTo(filteredDestinations[0]!.path);
        }
    };

    const closeOnOutsideClick = (element: HTMLElement) => {
        const handleWindowClick = (event: MouseEvent) => {
            if (!isDropdownOpen) {
                return;
            }
            if (event.target instanceof Node && !element.contains(event.target)) {
                searchDismissedFor = search;
            }
        };

        window.addEventListener("click", handleWindowClick);
        return () => {
            window.removeEventListener("click", handleWindowClick);
        };
    };
</script>

<span class="relative z-30 flex items-center justify-center h-16 sm:h-24 w-full bg-[#eae0d5]">
    <span
        class={[
            "flex min-w-0 items-center justify-start gap-1.5 pl-2 sm:pl-3",
            showSearch ? "w-1/3" : "flex-1",
        ]}
    >
        {#if hasVineyardRole}
            <button
                type="button"
                aria-label="Toggle navigation menu"
                aria-expanded={!menu.folded}
                class="md:hidden inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#4a3428] transition-colors hover:bg-[#dfd2c3]"
                onclick={toggleMenu}
            >
                <svg
                    viewBox="0 0 24 24"
                    class="h-6 w-6 stroke-current"
                    fill="none"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    {#if menu.folded}
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    {:else}
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="6" y1="18" x2="18" y2="6" />
                    {/if}
                </svg>
            </button>
        {/if}

        <a
            href="/"
            class="brand-link flex min-w-0 items-center justify-start cursor-pointer no-underline"
        >
            <img alt="Logo" src={logo} class="h-11 w-11 sm:h-20 sm:w-20 shrink-0 mr-1.5 sm:mr-2" />
            <p class={["text-zinc-800 font-semibold text-base sm:text-2xl truncate", !showSearch && "whitespace-nowrap"]}>
                Vinery
            </p>
        </a>
    </span>

    {#if showSearch}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
            {@attach closeOnOutsideClick}
            class="relative flex items-center justify-center w-1/3"
            onkeydown={handleSearchKeydown}
            onfocusin={() => {
                if (searchDismissedFor !== null) {
                    searchDismissedFor = null;
                }
            }}
        >
            <SearchField
                bind:value={search}
                placeholder="Search"
                class="max-w-md ml-4"
            />

            {#if isDropdownOpen}
                <div
                    role="listbox"
                    aria-label="Quick navigation results"
                    class="absolute top-full left-4 right-0 z-50 mx-auto mt-2 max-w-md overflow-hidden rounded-2xl border border-[#d9cbbd] bg-[#fbf7f2] shadow-lg"
                >
                    {#if filteredDestinations.length === 0}
                        <p class="px-4 py-3 text-sm text-[#8c735c]">
                            No matching modules for "{search.trim()}".
                        </p>
                    {:else}
                        <ul class="divide-y divide-[#efe6dc]">
                            {#each filteredDestinations as item (item.path)}
                                <li>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected="false"
                                        onclick={() => navigateTo(item.path)}
                                        class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#efe6dc]"
                                    >
                                        <span class="min-w-0">
                                            <span class="block truncate text-sm font-semibold text-[#3f2e22]">
                                                {item.label}
                                            </span>
                                            <span class="block truncate text-xs text-[#8c735c]">
                                                {item.path}
                                            </span>
                                        </span>
                                        <span class="shrink-0 rounded-full border border-[#d9cbbd] bg-[#f7f1ea] px-2.5 py-0.5 text-[11px] font-medium text-[#6b4f3a]">
                                            {item.section}
                                        </span>
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}
        </span>
    {/if}

    <span class={["flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 pr-2 sm:pr-4", showSearch && "w-1/3"]}>
        {#if session.user}
            {#if hasVineyardRole}
                <TasksHeaderButton />
            {/if}
            <ProfileMenu />
        {:else}
            <a
                href="/auth"
                class="sign-in ml-auto flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg bg-[#e4d3c0] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[#4a3428] fill-[#4a3428] stroke-[#4a3428] transition-colors duration-200 hover:bg-[#d4c0a8]"
            >
                <span class="shrink-0" role="img" aria-hidden="true">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html loginIcon}
                </span>
                Sign in
            </a>
        {/if}
    </span>
</span>

<style>
    @reference "../../../app.css";

    .sign-in :global(svg) {
        @apply h-6 w-6;
        fill: inherit;
        stroke: inherit;
    }

    .sign-in :global(svg *) {
        fill: inherit;
        stroke: inherit;
    }
</style>
