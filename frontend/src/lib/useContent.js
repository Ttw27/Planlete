import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

let cache = null;
let inflight = null;
const listeners = new Set();

async function fetchContent() {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = axios
    .get(`${API}/content`)
    .then((res) => {
      cache = res.data || {};
      inflight = null;
      listeners.forEach((cb) => cb(cache));
      return cache;
    })
    .catch(() => {
      cache = {};
      inflight = null;
      return cache;
    });
  return inflight;
}

export function notifyContentChanged() {
  cache = null;
  fetchContent();
}

/**
 * useContent — returns the editable text override for `key` if it exists,
 * otherwise returns `defaultValue`. Updates live when admin changes content.
 */
export function useContent(key, defaultValue) {
  const [value, setValue] = useState(() =>
    cache && cache[key] != null ? cache[key] : defaultValue,
  );

  useEffect(() => {
    let alive = true;
    fetchContent().then((c) => {
      if (alive && c && c[key] != null) setValue(c[key]);
    });
    const cb = (c) => {
      if (!alive) return;
      if (c && c[key] != null) setValue(c[key]);
      else setValue(defaultValue);
    };
    listeners.add(cb);
    return () => {
      alive = false;
      listeners.delete(cb);
    };
  }, [key, defaultValue]);

  return value;
}

export function useAllContent() {
  const [content, setContent] = useState(cache || {});
  useEffect(() => {
    let alive = true;
    fetchContent().then((c) => alive && setContent(c || {}));
    const cb = (c) => alive && setContent(c || {});
    listeners.add(cb);
    return () => {
      alive = false;
      listeners.delete(cb);
    };
  }, []);
  return content;
}
