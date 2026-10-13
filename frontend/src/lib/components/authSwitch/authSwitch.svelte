<script lang="ts">
    let {
        prefix,
        keyword,
        onClick: onClickFunction = () => {},
    }: {
        prefix: string;
        keyword: string;
        onClick?: () => void;
    } = $props();
</script>

<div class="flex w-full flex-col items-center gap-3">
    <div class="flex w-full items-center gap-3">
        <span class="h-px flex-1 bg-[#d9cbbd]"></span>
        <span class="text-sm text-zinc-500">or</span>
        <span class="h-px flex-1 bg-[#d9cbbd]"></span>
    </div>
    <p class="text-sm text-zinc-500">
        {prefix}
        <button
            type="button"
            class="cursor-pointer font-semibold text-[#6b4f3a] transition-colors duration-200 hover:text-[#3d2a1c]"
            onclick={() => onClickFunction()}
        >
            {keyword}
        </button>
    </p>
</div>
