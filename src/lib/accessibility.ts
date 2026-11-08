import { prefersReducedMotion } from "svelte/motion";

export const animValue = (value: number) => (prefersReducedMotion.current ? 0 : value);