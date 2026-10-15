import { createFileRoute } from "@tanstack/react-router";

// A section of the shell (`_app`). A path under it that matches nothing shows
// "not found" inside the shell (SHELL-09).
export const Route = createFileRoute("/_auth/_app/sessions")({});
