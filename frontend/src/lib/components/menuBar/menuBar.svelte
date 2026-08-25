<script lang="ts">
    import MenuButton from "../buttons/menuButton.svelte";
    import agriIcon from "../../assets/agriculture.svg?raw";
    import vineryIcon from "../../assets/vinery.svg?raw";
    import packedIcon from "../../assets/box.svg?raw";
    import raportIcon from "../../assets/raport.svg?raw";
    import workersIcon from "../../assets/workers.svg?raw";
    import openIcon from "../../assets/open_menu.svg?raw";

    import { menu, toggleMenu } from "$lib/stores/menu.svelte";

    const goTo = (path: string) => {
        window.location.href = path;
    };

    type Button = {
        name: string;
        icon: string;
        goTo: string;
    };

    const buttons: Button[] = [
        {
            name: "Field work",
            icon: agriIcon,
            goTo: "/agriculture",
        },
        {
            name: "Vinery",
            icon: vineryIcon,
            goTo: "/vinery",
        },
        {
            name: "Packed products",
            icon: packedIcon,
            goTo: "/packed-products",
        },
        {
            name: "Raports",
            icon: raportIcon,
            goTo: "/raports",
        },
        {
            name: "Workers",
            icon: workersIcon,
            goTo: "/workers",
        },
    ];
</script>

<span
    class="absolute top-0 left-0 flex flex-col gap-2 w-72 h-full p-2 bg-gray-100 shadow-lg transition-all duration-300 ease-in-out"
    class:!w-16={menu.folded}
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
        {#each buttons as button (button.goTo)}
            <MenuButton
                text={button.name}
                svg={button.icon}
                onClick={() => goTo(button.goTo)}
                isFolded={menu.folded}
            />
        {/each}
    </span>
</span>

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
