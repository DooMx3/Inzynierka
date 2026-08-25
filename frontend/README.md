# Usage instructions

## Installation

You need [pnpm](https://pnpm.io) and [bun](https://bun.sh).

To install the necessary dependencies, run the following command:

```bash
pnpm install
```

To run the project, use the following command:

```bash
bun dev
```

To run the tests, use the following command:

```bash
bun test
```

```bash
bun run build
```

`bun run build` runs the tests first (`prebuild`).

Components and helpers sit in `src/lib`. Import them with `$lib/...`. If a component takes an SVG, import the file with `?raw`.

## Project Structure

```
bunfig.toml - bun test preload + ignore paths
svelte-loader.ts - compiles Svelte for bun test
src/ - Contains the source code for the project.
	↳ app.css - tailwind
	↳ app.d.ts
	↳ app.html
	↳ bun-test.d.ts - jest-dom matchers for bun:test
	↳ setupTests.ts - happy-dom globals are registered in svelte-loader; this file extends expect + cleans up
	↳ routes/
		↳ +layout.svelte - favicon, global css, title bar, menu, glass blur
		↳ +page.svelte - all components dumped here for now
	↳ lib/ - this is `$lib`
		↳ index.ts
		↳ stores/
			↳ menu.svelte.ts - folded/expanded menu state
			↳ account.svg
			↳ add.svg
			↳ agriculture.svg
			↳ box.svg
			↳ cancel.svg
			↳ check.svg
			↳ chevron_right.svg
			↳ close.svg
			↳ close_menu.svg
			↳ control.svg
			↳ createAccount.svg
			↳ drop_down.svg
			↳ favicon.svg
			↳ filter.svg
			↳ login.svg
			↳ logo.webp
			↳ new_batch.svg
			↳ open_menu.svg
			↳ plus.svg
			↳ raport.svg
			↳ register.svg
			↳ search.svg
			↳ sort.svg
			↳ task.svg
			↳ vinery.svg
			↳ workers.svg
		↳ components/
			↳ breadcrumbs/
				↳ breadcrumbs.svelte
			↳ buttons/
				↳ button.svelte - base button, the others wrap this
				↳ acceptButton.svelte
				↳ cancelButton.svelte
				↳ createAccountButton.svelte
				↳ loginButton.svelte
				↳ menuButton.svelte
				↳ newBatchButton.svelte
				↳ plannedTasksButton.svelte
				↳ profileDropdownButton.svelte
				↳ registerButton.svelte
			↳ confirmationDialog/
				↳ confirmationDialog.svelte
			↳ dropdownInput/
				↳ dropdownInput.svelte
			↳ formWindow/
				↳ formWindow.svelte
			↳ glassBlur/
				↳ glassBlur.svelte
			↳ inputField/
				↳ inputField.svelte
			↳ menuBar/
				↳ menuBar.svelte
			↳ passwordUtilities/
				↳ passwordConditionsIndicator.svelte
				↳ passwordStrengthIndicator.svelte
			↳ searchField/
				↳ searchField.svelte
			↳ subpageTitle/
				↳ subpageTitle.svelte
			↳ tableComponents/
				↳ filterBy/
					↳ filterBy.svelte
				↳ searchBar/
					↳ searchBar.svelte
				↳ searchButton/
					↳ searchButton.svelte
				↳ sortBy/
					↳ sortBy.svelte
			↳ titleBar/
				↳ titleBar.svelte
			↳ userMenu/
				↳ userMenu.svelte
				↳ createVineyardButton.svelte
				↳ invitationButton.svelte
		↳ functions/
			↳ passwordStrengthChecker.ts - zxcvbn, polish + english dictionaries
			↳ passwordConditionsChecker.ts - checks if password meets conditions (length, uppercase, lowercase, number, special char)

static/ - Contains static assets such as images, fonts, and other files.
	↳ robots.txt
```

## Components usage

### Button

```svelte
<script lang="ts">
    import Button from "$lib/components/buttons/button.svelte";
    import icon from "$lib/assets/favicon.svg?raw";
</script>

<Button
    text="Clicker"
    svg={icon}
    class="bg-red-500 text-white"
    onClick={() => console.log("clicked")}
/>
```

`text` and `svg` can be left empty. `class` is extra tailwind. `onClick` defaults to doing nothing.

### LoginButton, RegisterButton, CreateAccountButton, PlannedTasksButton

Same as Button, but you only pass `onClick`. Label and icon are hardcoded.

```svelte
<script lang="ts">
    import LoginButton from "$lib/components/buttons/loginButton.svelte";
    import RegisterButton from "$lib/components/buttons/registerButton.svelte";
    import CreateAccountButton from "$lib/components/buttons/createAccountButton.svelte";
    import PlannedTasksButton from "$lib/components/buttons/plannedTasksButton.svelte";
</script>

<LoginButton onClick={() => {}} />
<RegisterButton onClick={() => {}} />
<CreateAccountButton onClick={() => {}} />
<PlannedTasksButton onClick={() => {}} />
```

Login is gray. Register and CreateAccount are green ("Create free account" on that last one). PlannedTasks is blue and has no text, just the icon.

### AcceptButton, CancelButton, NewBatchButton

```svelte
<script lang="ts">
    import AcceptButton from "$lib/components/buttons/acceptButton.svelte";
    import CancelButton from "$lib/components/buttons/cancelButton.svelte";
    import NewBatchButton from "$lib/components/buttons/newBatchButton.svelte";
</script>

<AcceptButton onClick={() => {}} />
<CancelButton onClick={() => {}} />
<NewBatchButton onClick={() => {}} />
```

Accept is green with check icon (`"Confirm"` default). Cancel is red with cancel icon (`"Cancel"` default). NewBatch is gray with batch icon (`"Create new batch"` default). All accept optional `text` prop if you want to override the label.

### MenuButton

```svelte
<script lang="ts">
    import MenuButton from "$lib/components/buttons/menuButton.svelte";
    import agriIcon from "$lib/assets/agriculture.svg?raw";
</script>

<MenuButton
    text="Field work"
    svg={agriIcon}
    isFolded={false}
    onClick={() => {}}
/>
```

Blue full-width item for the sidebar. Default label is `"Agrokultura"`. When `isFolded` is true, the label is hidden and the button shrinks to the icon.

### ProfileDropdownButton

```svelte
<script lang="ts">
    import ProfileDropdownButton from "$lib/components/buttons/profileDropdownButton.svelte";
</script>

<ProfileDropdownButton
    accountName="Henryk"
    class="mt-4"
    onClick={() => {}}
/>
```

Shows avatar + name + chevron. `accountName` is `"Profile"` if you skip it. There is no dropdown yet, only the button.

### InputField

```svelte
<script lang="ts">
    import InputField from "$lib/components/inputField/inputField.svelte";
    import loginIcon from "$lib/assets/login.svg?raw";

    let username = $state("");
    let email = $state("");
</script>

<InputField
    label="Username"
    placeholder="Enter your username"
    bind:value={username}
    svg={loginIcon}
    class="max-w-sm"
/>

<InputField
    label="Email"
    placeholder="Enter your email"
    type="email"
    labelPosition="left"
    bind:value={email}
    class="max-w-lg mt-4"
/>
```

`bind:value` for the text. Label goes on top by default, or `labelPosition="left"`. `type` can be `text`, `password`, `email` or `search`. `svg` sits to the left of the input.

### SearchField

```svelte
<script lang="ts">
    import SearchField from "$lib/components/searchField/searchField.svelte";

    let search = $state("");
</script>

<SearchField bind:value={search} placeholder="Search" class="max-w-md" />
```

Search icon on the left, Ctrl+K / Cmd+K hint on the right. That shortcut actually focuses the input.

### TitleBar

```svelte
<script lang="ts">
    import TitleBar from "$lib/components/titleBar/titleBar.svelte";
</script>

<TitleBar />
```

Three columns: logo + app name, search, profile dropdown. No props yet — name and account are hardcoded.

### MenuBar

```svelte
<script lang="ts">
    import MenuBar from "$lib/components/menuBar/menuBar.svelte";
</script>

<MenuBar />
```

Sidebar with Field work / Vinery / Packed products / Raports / Workers. Folded/expanded state comes from `$lib/stores/menu.svelte` (`menu.folded`, `toggleMenu()`). Clicking an item sets `window.location.href`.

### GlassBlur

```svelte
<script lang="ts">
    import GlassBlur from "$lib/components/glassBlur/glassBlur.svelte";
</script>

<div class="relative">
    <GlassBlur />
</div>
```

Full-parent overlay (`absolute inset-0`), not a button. Pass `class` if you need something extra (e.g. `fixed`).

### PasswordStrengthIndicator

```svelte
<script lang="ts">
    import PasswordStrengthIndicator from "$lib/components/passwordUtilities/passwordStrengthIndicator.svelte";

    let password = $state("");
    let username = $state("");
</script>

<PasswordStrengthIndicator
    password={password}
    userInput={[username]}
    class="mt-4"
/>
```

`userInput` is a string array (username, email, etc.). If those show up in the password, the score drops. Bars: 1-5, from zxcvbn score 0-4.

Scoring itself is `checkPasswordStrength` in `$lib/functions/passwordStrengthChecker.ts`. Returns `{ score, feedback }`.

### PasswordConditionsIndicator

```svelte
<script lang="ts">
    import PasswordConditionsIndicator from "$lib/components/passwordUtilities/passwordConditionsIndicator.svelte";

    let password = $state("");
</script>

<PasswordConditionsIndicator
    password={password}
    class="mt-4"
/>
```

Lists the password rules (length, case, number, special char) with a check or close icon. The actual checks are `checkPasswordConditions` in `$lib/functions/passwordConditionsChecker.ts`.


### UserMenu

```svelte
<script lang="ts">
    import UserMenu from "$lib/components/userMenu/userMenu.svelte";
    import addIcon from "$lib/assets/add.svg?raw";
</script>

<UserMenu
    svg={addIcon}
    text="Create new vineyard"
    onClick={() => {}}
    disabled={false}
/>
```

Large card button with dashed border. Renders centered icon and label. When `disabled` is true, opacity drops, grayscale applies, hover scaling is disabled, and clicks are blocked.

### CreateVineyardButton, InvitationButton

```svelte
<script lang="ts">
    import CreateVineyardButton from "$lib/components/userMenu/createVineyardButton.svelte";
    import InvitationButton from "$lib/components/userMenu/invitationButton.svelte";
</script>

<CreateVineyardButton onClick={() => {}} disabled={false} />
<InvitationButton onClick={() => {}} disabled={false} />
```

Wrappers around `UserMenu`. CreateVineyard has add icon and `"Create new vineyard"`. InvitationButton has winery icon and `"You have been invited! Click to review details"`. Both accept `onClick` and `disabled`.

### Breadcrumbs

```svelte
<script lang="ts">
    import Breadcrumbs from "$lib/components/breadcrumbs/breadcrumbs.svelte";
</script>

<Breadcrumbs additionalCrumbs={["Plots", "Plot 1"]} />
```

Reads route path from `$app/state`, capitalizes path segments separated by `" / "`, and appends optional `additionalCrumbs`. Styled in muted zinc (`text-zinc-400`).

### SubpageTitle

```svelte
<script lang="ts">
    import SubpageTitle from "$lib/components/subpageTitle/subpageTitle.svelte";
</script>

<SubpageTitle />
<SubpageTitle text="Custom Title" />
```

Heading in large bold zinc text (`text-3xl font-bold text-zinc-400`). If `text` prop is provided, it renders that text. Otherwise, it extracts and capitalizes the last segment of the current URL path.

### FormWindow

```svelte
<script lang="ts">
    import FormWindow from "$lib/components/formWindow/formWindow.svelte";
</script>

<FormWindow
    title="New vineyard"
    additionalCrumbs={["Winery", "Add"]}
    onClose={() => {}}
    onCancel={() => {}}
    onAccept={() => {}}
    acceptText="Save"
    cancelText="Cancel"
>
    <form class="flex flex-col gap-4">
        <!-- form fields here -->
    </form>
</FormWindow>
```

Centered popup modal with backdrop blur. Top-left has breadcrumbs and title (via `SubpageTitle`). Top-right has close button. Center renders form content passed via children snippet (`<FormWindow><form>...</form></FormWindow>`). Bottom-right has Cancel and Accept buttons. Breadcrumbs can be hidden via `showBreadcrumbs={false}`.

### ConfirmationDialog

```svelte
<script lang="ts">
    import ConfirmationDialog from "$lib/components/confirmationDialog/confirmationDialog.svelte";
</script>

<ConfirmationDialog
    text="Are you sure you want to delete this item?"
    onAccept={() => {}}
    onCancel={() => {}}
    onClose={() => {}}
/>
```

Confirmation popup built on top of `FormWindow`. Defaults `title` to `"Confirmation dialog"`, disables breadcrumbs, and displays message text inside a `span`.

### DropdownInput

```svelte
<script lang="ts">
    import DropdownInput from "$lib/components/dropdownInput/dropdownInput.svelte";
    import listIcon from "$lib/assets/task.svg?raw";

    let selectedValue = $state("");
</script>

<DropdownInput
    placeholder="Number"
    additionalIcon={listIcon}
    bind:value={selectedValue}
    options={[
        { value: "1", label: "Plot 1" },
        { value: "2", label: "Plot 2" }
    ]}
/>
```

Custom styled dropdown selector with matching dark theme. Shows optional left icon (`additionalIcon` / `svg`), center label/placeholder, and right animated chevron arrow (`drop_down.svg`). The options menu matches the container style and never displays the placeholder inside the options list. Closes on option select, click outside, or Escape. Supports string arrays or `{ value, label }` objects.


### SortBy, FilterBy, SearchBar, SearchButton

```svelte
<script lang="ts">
    import SortBy from "$lib/components/tableComponents/sortBy/sortBy.svelte";
    import FilterBy from "$lib/components/tableComponents/filterBy/filterBy.svelte";
    import SearchBar from "$lib/components/tableComponents/searchBar/searchBar.svelte";
    import SearchButton from "$lib/components/tableComponents/searchButton/searchButton.svelte";
</script>

<SortBy />
<FilterBy />
<SearchBar placeholder="Search" />
<SearchButton onClick={() => {}} />
```

Table controls. SortBy displays a `"Sort by"` label with `sort.svg` icon and sorting options inside a `DropdownInput`. FilterBy displays a `"Filters"` label with `filter.svg` icon and filter options inside a `DropdownInput`. SearchBar displays a `"What are you looking for?"` label with `search.svg` icon and a text input. SearchButton is a blue button with search icon and `"Search"` label (supports custom `text` and `onClick`).



