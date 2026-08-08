import { useEffect } from "react";

/**
 * Per-page title and meta description.
 *
 * Every page currently inherits the one title tag in index.html, so Google
 * sees eleven pages called "Planlete — Built for You. Training plan as an
 * app." and has no reason to rank any of them for anything specific.
 *
 * No dependency needed. Googlebot renders JavaScript and reads the final
 * DOM, so setting these in an effect is sufficient — react-helmet would add
 * a package for the same result.
 */
export function useSeo({ title, description, canonical }) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }
  }, [title, description, canonical]);
}
