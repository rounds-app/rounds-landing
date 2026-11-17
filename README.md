# Rounds landing page

One-page static site for Rounds: voice-based virtual patients for clinical education.
Plain HTML and CSS with a self-hosted demo video in `assets/`; no build step.
GitHub Pages serves it from the root of `main`.

Preview locally:

    python3 -m http.server 8000

then open http://localhost:8000.

Lint and test (Node 22+):

    npm install
    npm run check

`npm run lint` runs html-validate on the pages and stylelint on `styles.css`;
`npm test` runs the checks in `tests/` with Node's built-in test runner
(missing local files, broken in-page anchors, team cards).
CI runs the same `npm run check` on every push to `main` and on pull requests.
