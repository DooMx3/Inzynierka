import { afterEach, expect } from 'bun:test';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/svelte';
import { gooeyToast } from 'goey-toast-svelte';

expect.extend(matchers);

afterEach(() => {
	gooeyToast.dismiss();
	cleanup();
});
