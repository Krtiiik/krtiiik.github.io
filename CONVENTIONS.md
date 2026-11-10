# Conventions

- **Links** go in `_data/links.yml`, never hardcoded in layouts.
- **Icons** are inline SVGs with `fill`/`stroke="currentColor"` and `aria-hidden="true"`; the link or button carries the `aria-label`. Social icons live in `_includes/icons/<name>.svg`. No icon fonts or CDNs.
- **Colors** come from the custom properties in `stylesheet.css`; don't write raw colors elsewhere. The only exception is `assets/favicon.svg`, which can't read CSS variables and copies `--a1`.
- **No third-party requests**: fonts, scripts and images are served from this repo.
- **Placeholders** for copy are written as `[bracketed text]`, so they are easy to find.
