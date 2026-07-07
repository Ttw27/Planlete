import { useState, useEffect } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

export function useImages() {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/images`)
      .then((r) => r.json())
      .then((data) => {
        setImages(data || {});
      })
      .catch(() => {
        setImages({});
      })
      .finally(() => setLoading(false));
  }, []);

  return { images, loading };
}
