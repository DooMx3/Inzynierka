<script lang="ts">
    import MenuButton from "../buttons/menuButton.svelte";
    import agriIcon from "../../assets/agriculture.svg?raw";
    import vineryIcon from "../../assets/vinery.svg?raw";
    import packedIcon from "../../assets/box.svg?raw";
    import raportIcon from "../../assets/raport.svg?raw";
    import workersIcon from "../../assets/workers.svg?raw";
    import openIcon from "../../assets/open_menu.svg?raw";

    import { menu, toggleMenu } from "$lib/stores/menu.svelte";
    import { session } from "$lib/stores/session.svelte";

    const goTo = (path: string) => {
        window.location.href = path;
    };

    type Button = {
        name: string;
        icon: string;
        goTo: string;
        roles: string[];
    };

    const buttons: Button[] = [
        {
            name: "Field work",
            icon: agriIcon,
            goTo: "/agriculture",
            roles: ["WORKER", "OENOLOGIST", "OWNER"],
        },
        {
            name: "Vinery",
            icon: vineryIcon,
            goTo: "/vinery",
            roles: ["OENOLOGIST", "OWNER"],
        },
        {
            name: "Packed products",
            icon: packedIcon,
            goTo: "/packed-products",
            roles: ["OENOLOGIST", "OWNER"],
        },
        {
            name: "Raports",
            icon: raportIcon,
            goTo: "/raports",
            roles: ["OWNER"],
        },
        {
            name: "Workers",
            icon: workersIcon,
            goTo: "/workers",
            roles: ["OWNER"],
        },
    ];

    const visibleButtons = $derived(
        buttons.filter((button) =>
            button.roles.some((role) => session.user?.roles.includes(role)),
        ),
    );
</script>

{#if visibleButtons.length > 0}
    <span
        class={[
            "absolute top-0 left-0 flex flex-col gap-2 w-72 h-full p-2 bg-[#f7f1ea] shadow-lg transition-all duration-300 ease-in-out",
            menu.folded && "!w-16",
        ]}
    >
        <div class="flex w-full items-center">
            <span class="min-w-0 flex-1"></span>
            <button
                class={["shrink-0", !menu.folded && "is-open"]}
                onclick={toggleMenu}
            >
                {@html openIcon}
            </button>
            <span
                class="min-w-0 transition-[flex-grow] duration-300 ease-in-out"
                style:flex-grow={menu.folded ? 1 : 0}
            ></span>
        </div>
        <span class="flex flex-col gap-2 justify-center items-stretch flex-1">
            {#each visibleButtons as button (button.goTo)}
                <MenuButton
                    text={button.name}
                    svg={button.icon}
                    onClick={() => goTo(button.goTo)}
                    isFolded={menu.folded}
                />
            {/each}
        </span>
    </span>
{/if}

<style>
    @reference "../../../app.css";

    span :global(svg) {
        @apply h-8 w-8;
        fill: inherit;
        stroke: inherit;
    }

    span :global(svg path:first-of-type) {
        transform-box: fill-box;
        transform-origin: center;
        transition: transform 300ms ease-in-out;
    }

    span :global(.is-open svg path:first-of-type) {
        transform: rotate(180deg);
    }
</style>
