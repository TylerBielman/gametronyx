import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clearHash, readHashParam } from './hashParams';

/**
 * A one-time value from the URL fragment (#token=…, #code=…), captured and
 * then stripped from the address bar. Also catches fragment-only navigations
 * (pasting a reset link into a tab already on /reset), which don't remount.
 */
export function useHashParam(name: string): string | null {
  const { hash } = useLocation();
  const [value, setValue] = useState<string | null>(() => readHashParam(name));

  useEffect(() => {
    const fresh = readHashParam(name, hash) ?? readHashParam(name);
    if (fresh) setValue(fresh);
    if (readHashParam(name)) clearHash();
  }, [hash, name]);

  return value;
}
