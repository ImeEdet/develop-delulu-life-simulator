/** Increment this release version for a feature/release milestone; Vite adds a unique build id. */
export const APP_RELEASE_VERSION = "3.1.0";

declare const __APP_BUILD_ID__: string;
const buildId = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";

/** The build suffix lets users identify every deployed update from the main menu. */
export const APP_VERSION = `v${APP_RELEASE_VERSION}+${buildId}`;
