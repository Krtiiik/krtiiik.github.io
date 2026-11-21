# Changelog

All notable changes to this site are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Dark and light themes with a toggle in the header. The site follows the system theme until a visitor picks one, then remembers it.
- Single home page as a hub: a large name with an intro panel and a résumé button, plus cards for Resume and Songbook.
- Animated background with three scenes: DJ hardware, math and an oscilloscope. Each visit starts on a random one, and the pulsing orange dot before the name swoops to the next. The scenes react gently to the pointer and to scrolling, without moving the page content.
- Pause button for the background; the choice is remembered.
- GitHub and LinkedIn icon links next to the résumé button.
- Page description and Open Graph tags, so shared links get a proper title and summary.
- Favicon: the orange scene switch dot, matching the light or dark system theme.
- Custom "not found" page in the site style, with a link back home.

### Changed

- New look: one framed column of thin lines on near-neutral grey, with square edges, one orange highlight, and Inter Tight and DM Mono type. The intro is a box that comes in from the left edge of the column, with the background scene open above, below and beside it; the cards sit in tiles that share their borders.
- The background scenes are drawn in the page ink with orange for the main subject, instead of orange, cyan and blue.
- The résumé button and the GitHub and LinkedIn links are now square buttons in one row that invert on hover.
- Fonts are served from this site instead of Google Fonts, so visiting the page makes no third-party requests.

### Removed

- The separate About page and the header nav; the home intro now carries the about text and the cards do the navigation.
