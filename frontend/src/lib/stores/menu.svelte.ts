export const menu = $state({
    folded: true,
});

export const toggleMenu = () => {
    menu.folded = !menu.folded;
};
