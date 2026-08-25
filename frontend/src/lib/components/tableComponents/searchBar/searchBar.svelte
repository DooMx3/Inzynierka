<script lang="ts">
    import searchIcon from "$lib/assets/search.svg?raw";
    let { placeholder = "Search" } = $props();
</script>


<span class="flex items-center flex-col gap-2">
    <span class="flex w-full items-start pl-1">What are you looking for?</span>
    <div class="flex items-center rounded-lg bg-zinc-800 w-full h-10 pl-4 pr-4">
        <div class="flex items-center justify-center w-10 h-full">
            {@html searchIcon}
        </div>
        <input
            type="text"
            placeholder={placeholder}
            class="bg-transparent text-white placeholder:text-zinc-400 focus:outline-none w-full h-full px-2"
        />
    </div>
</span>

