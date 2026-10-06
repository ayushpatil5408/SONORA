/**
 * SONORA Environment Configuration Utility
 * Safely accesses runtime environment variables in both Vite/browser and Node/test environments.
 */

export function getEnvVariable(key: string): string | undefined {
  try {
    const proc = (globalThis as any).process;
    if (proc && proc.env && typeof proc.env[key] === 'string') {
      return proc.env[key];
    }
  } catch {
    // Ignore in non-Node environments
  }

  try {
    const meta = import.meta as any;
    if (meta && meta.env && typeof meta.env[key] === 'string') {
      return meta.env[key];
    }
  } catch {
    // Ignore if import.meta.env is undefined
  }

  return undefined;
}

export function isDevelopmentMode(): boolean {
  try {
    const proc = (globalThis as any).process;
    if (proc && proc.env && proc.env.NODE_ENV) {
      return proc.env.NODE_ENV !== 'production';
    }
  } catch {
    // Ignore
  }

  try {
    const meta = import.meta as any;
    if (meta && meta.env) {
      return meta.env.DEV !== false;
    }
  } catch {
    // Ignore
  }

  return true;
}
