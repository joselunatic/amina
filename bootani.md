# Boot Animation Observability

## Current state
- The boot monitor runs `startBootSequence()` and leaves `#boot-menu` visible (it now only swaps the `boot-menu--animating` class while typing, rather than keeping `hidden`) so the selectors appear as soon as the injection console finishes typing the intro lines.
- `showBootScreen()` resets the form fields, shows the menu, and replays the sequence, while `hideBootScreen()` only hides the overlay once the user is authenticated. That means we can rely on the `boot-menu` classes and `#boot-output` text to know when it is safe to interact.

## Troubleshooting checklist
1. After the CRT animation, the last line in `#boot-output` should read `>> Esperando selección de autorización...`. If it halts before that, check the console for `startBootSequence` errors and rerun `startBootSequence()` manually if necessary.
2. The agent/DM buttons should never remain in the DOM with the `hidden` class set unless the DM form is active; to inspect this, open DevTools and verify `#boot-menu` has `boot-menu--animating` while typing and that the class is removed once the text finishes.
3. For authentication errors, call `/api/auth/agent` or `/api/auth/dm` manually to verify the API is responding, then clear `#boot-status` and ensure `hideBootScreen()` is executed through the login callbacks.
4. If the boot menu flattens out after a rebuild, refer to this document before touching `public/app.js`—the key hooks are around `showBootScreen()`, `bootMenu.classList` toggles, and the `startBootSequence()` `finally` block.

Keeping this file current will make it easier to see whether the animation is the root cause when the boot UI breaks in the future.
