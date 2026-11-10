# Architecture

A static Jekyll 4 site with a single home page plus a 404 page.

- **Layouts**: `default` is the shell (background canvas, header, footer). `home` renders the hero and cards; `page` renders a panel with prose and is used by the 404 page.
- **Links are data**: all cards and socials come from `_data/links.yml`, so adding a link never touches markup.
- **Background**: `assets/js/main.js` draws the scenes on a fixed canvas and reads colors from the CSS custom properties, so the palette has one source.
- **Theme**: an inline script in `head.html` sets `data-theme` before first paint to avoid a flash of the wrong theme.

## Decisions

- **One page, no About**: the intro carries the about text and the cards do the navigation; a separate page stayed thin.
- **Own CI build instead of `actions/jekyll-build-pages`**: that action runs Jekyll 3 via the github-pages gem and ignores the Gemfile. Building from `Gemfile.lock` keeps local and deployed output identical.
- **Self-hosted fonts**: no third-party requests (GDPR), and latin-ext subsets cover Czech diacritics.
- **SEO via jekyll-seo-tag**: titles, description and Open Graph tags from `_config.yml` in one place. An OG image is planned once the design settles (`image:` in `_config.yml`).
