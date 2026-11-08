// HA persists `dockedSidebar` to localStorage on every dock change, so after a reload on a
// dashboard that hides the sidebar, 'always_hidden' is our own earlier hide, not the user's choice.
// ponytail: a user who really set 'always_hidden' (profile "force narrow") gets 'docked' on leaving;
// telling them apart needs our own persisted copy of the original value.
export function dockToRestore(current: string | undefined): string {
  return current && current !== "always_hidden" ? current : "docked";
}
