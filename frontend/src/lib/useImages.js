import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

let cache = null;
let inflight = null;
const listeners = new Set();

async function fetchImages() {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = axios
    .get(`${API}/images`)
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

export function invalidateImageCache() {
  cache = null;
}

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export function useImageOverride(key, defaultUrl) {
  const [url, setUrl] = useState(() =>
    cache && cache[key] ? resolveUrl(cache[key]) : defaultUrl,
  );

  useEffect(() => {
    let alive = true;
    fetchImages().then((c) => {
      if (alive && c && c[key]) setUrl(resolveUrl(c[key]));
    });
    const cb = (c) => {
      if (!alive) return;
      if (c && c[key]) setUrl(resolveUrl(c[key]));
      else setUrl(defaultUrl);
    };
    listeners.add(cb);
    return () => {
      alive = false;
      listeners.delete(cb);
    };
  }, [key, defaultUrl]);

  return url;
}

export function useAllImages() {
  const [images, setImages] = useState(cache || {});
  useEffect(() => {
    let alive = true;
    fetchImages().then((c) => {
      if (alive) setImages(c || {});
    });
    const cb = (c) => alive && setImages(c || {});
    listeners.add(cb);
    return () => {
      alive = false;
      listeners.delete(cb);
    };
  }, []);
  return images;
}

export function notifyImagesChanged() {
  invalidateImageCache();
  fetchImages();
}
