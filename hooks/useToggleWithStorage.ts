import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_EVENT = 'use-toggle-with-storage:update';

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);

    if (storedValue === null) {
      return fallback;
    }

    return JSON.parse(storedValue) as boolean;
  } catch {
    return fallback;
  }
}

function notifyStorageChange(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

function writeStoredBoolean(key: string, value: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyStorageChange(key);
  } catch {
    // Ignore storage write failures and keep the current UI state.
  }
}

function clearStoredBoolean(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
    notifyStorageChange(key);
  } catch {
    // Ignore storage write failures and keep the current UI state.
  }
}

type UseToggleWithStorageReturn = {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  set: (val: boolean) => void;
  reset: () => void;
};

export function useToggleWithStorage(
  key: string,
  initialValue: boolean = false
): UseToggleWithStorageReturn {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') {
        return () => undefined;
      }

      const handleChange = (event: Event) => {
        if (event instanceof StorageEvent) {
          if (event.key !== null && event.key !== key) {
            return;
          }
        }

        if (event instanceof CustomEvent) {
          const detail = event.detail as { key?: string } | null;

          if (detail?.key !== key) {
            return;
          }
        }

        onStoreChange();
      };

      window.addEventListener('storage', handleChange);
      window.addEventListener(STORAGE_EVENT, handleChange);

      return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener(STORAGE_EVENT, handleChange);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(
    () => readStoredBoolean(key, initialValue),
    [key, initialValue]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initialValue);

  const toggle = useCallback(() => {
    writeStoredBoolean(key, !readStoredBoolean(key, initialValue));
  }, [key, initialValue]);

  const setTrue = useCallback(() => {
    writeStoredBoolean(key, true);
  }, [key]);

  const setFalse = useCallback(() => {
    writeStoredBoolean(key, false);
  }, [key]);

  const set = useCallback((val: boolean) => {
    writeStoredBoolean(key, val);
  }, [key]);

  const reset = useCallback(() => {
    clearStoredBoolean(key);
  }, [key]);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    set,
    reset,
  };
}

// example usage:
// const { value: isOpen, toggle: toggleIsOpen, setTrue: open, setFalse: close } = useToggleWithStorage('my-toggle-key', false);
