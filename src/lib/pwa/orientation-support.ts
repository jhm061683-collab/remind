export type TemporaryOrientationMode = "lock" | "fullscreen-only";

export function getTemporaryOrientationMode(capabilities: {
  fullscreen: boolean;
  orientationLock: boolean;
}): TemporaryOrientationMode {
  return capabilities.fullscreen && capabilities.orientationLock
    ? "lock"
    : "fullscreen-only";
}
