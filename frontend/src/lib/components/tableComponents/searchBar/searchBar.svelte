<script lang="ts">
    import searchIcon from "$lib/assets/search.svg?raw";

    let {
        placeholder = "Search",
        label = "What are you looking for?",
        value = $bindable(""),
        onEnter = () => {},
    }: {
        placeholder?: string;
        label?: string;
        value?: string;
        onEnter?: () => void;
    } = $props();
</script>


<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1 text-sm text-zinc-700">{label}</span>
    <div class="flex items-center rounded-lg border border-[#c4b6a6] bg-white w-full h-10 pl-4 pr-4 text-[#6b4f3a]">
        <div class="flex items-center justify-center w-10 h-full">
            {@html searchIcon}
        </div>
        <input
            type="text"
            {placeholder}
            bind:value
            onkeydown={(event) => {
                if (event.key === "Enter") {
                    onEnter();
                }
            }}
            class="bg-transparent text-zinc-800 placeholder:text-zinc-400 focus:outline-none w-full h-full px-2"
        />
    </div>
</span>

