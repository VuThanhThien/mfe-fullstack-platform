/**
 * Subscribes the shell to `@mfe/ui` theme mode (localStorage + CustomEvent).
 * Preference only — never auth tokens.
 */
import { getMode, subscribeMode, type ThemeMode } from '@mfe/ui';
import { useEffect, useState } from 'react';

export function useThemeMode(): ThemeMode {
  const [mode, setModeState] = useState<ThemeMode>(getMode);

  useEffect(() => subscribeMode(setModeState), []);

  return mode;
}
