/// <reference types="vite/client" />

// Without this, tsc does not know about import.meta.env and the typecheck gate
// rejects any build-time surface check. The surface constants are read through
// import.meta.env.VITE_SURFACE so that Vite substitutes a literal and the
// internal console branch can be dropped from the public bundle entirely.
