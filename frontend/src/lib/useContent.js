import { useEffect, useState, useCallback } from "react";
import { CONTENT_DEFAULTS } from "./contentKeys";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

// Global cache for content overrides
let contentCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Listeners for cache invalidation
const contentListeners = new Set();

export function notifyContentChanged() {
  contentCache = null;
  cacheTimestamp = 0;
  contentListeners.forEach((listener) => listener());
}

async function fetchContentFromServer() {
  try {
    const response = await fetch(`${API}/content`);
    if (!response.ok) throw new Error("Failed to fetch content");
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch content overrides:", error);
    return {};
  }
}

async function getContentOverrides() {
  const now = Date.now();
  
  // Return cached content if still valid
  if (contentCache && now - cacheTimestamp < CACHE_TTL) {
    return contentCache;
  }

  // Fetch fresh content
  contentCache = await fetchContentFromServer();
  cacheTimestamp = now;
  return contentCache;
}

/**
 * Hook to get a single content value with fallback to default
 * Usage: const text = useContent('hero_h1_line1', 'default text')
 */
export function useContent(key, defaultValue = null) {
  const [value, setValue] = useState(() => {
    return defaultValue ?? CONTENT_DEFAULTS[key] ?? key;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getContentOverrides().then((overrides) => {
      if (!mounted) return;
      const contentValue = overrides[key] ?? defaultValue ?? CONTENT_DEFAULTS[key] ?? key;
      setValue(contentValue);
      setIsLoading(false);
    });

    // Listen for cache invalidation
    const listener = () => {
      getContentOverrides().then((overrides) => {
        if (!mounted) return;
        const contentValue = overrides[key] ?? defaultValue ?? CONTENT_DEFAULTS[key] ?? key;
        setValue(contentValue);
      });
    };

    contentListeners.add(listener);
    return () => {
      mounted = false;
      contentListeners.delete(listener);
    };
  }, [key, defaultValue]);

  return value;
}

/**
 * Hook to get all content overrides
 * Usage: const overrides = useAllContent()
 */
export function useAllContent() {
  const [overrides, setOverrides] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getContentOverrides().then((data) => {
      if (!mounted) return;
      setOverrides(data);
      setIsLoading(false);
    });

    // Listen for cache invalidation
    const listener = () => {
      getContentOverrides().then((data) => {
        if (!mounted) return;
        setOverrides(data);
      });
    };

    contentListeners.add(listener);
    return () => {
      mounted = false;
      contentListeners.delete(listener);
    };
  }, []);

  return overrides;
}
