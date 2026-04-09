export type DesktopPlatform = 'macos' | 'windows' | 'linux';

export interface DesktopRuntimeConfig {
  mode: 'desktop';
  apiBaseUrl: string;
  wsBaseUrl: string;
  secret: string;
  platform: DesktopPlatform;
}

export const getDesktopRuntime = (): DesktopRuntimeConfig | undefined => {
  return window.__VERBALAIZE__;
};

export const isDesktopRuntime = () => {
  return Boolean(getDesktopRuntime());
};
