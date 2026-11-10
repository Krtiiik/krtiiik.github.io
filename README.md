# krtiiik.github.io

Personal homepage: a single-page hub linking my résumé, songbook and profiles.
Built with Jekyll 4 and deployed to GitHub Pages by the workflow in `.github/workflows/`.

## Run locally

```sh
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## Writing the copy

Every `[bracketed]` text is a placeholder to replace:

| Slot | Where | Aim for |
| --- | --- | --- |
| Tagline | `_config.yml` → `tagline` | 3–5 words; shown after the site title in the browser tab. |
| Description | `_config.yml` → `description` | One sentence, under ~155 characters; used in search results and link previews. |
| Intro | `index.md` → `intro` | 2–4 sentences in first person: who you are, what you do, one or two personal hooks. This is the only "about" text on the site. |
| Card texts | `_data/links.yml` → `cards[].text` | One short line (~60 characters) saying what the visitor gets behind the link. |
| LinkedIn URL | `_data/links.yml` → `socials` | Your profile URL. |
| Not-found line | `404.html` | Drafted already; rewrite it in your voice if you like. |

Keep the tone consistent with the design: playful, but brief. The page is a calling card, not a CV.
