# VS Code Motion Audit

An interactive audit of motion patterns in the VS Code Agents Window. The site combines component studies, product recordings, and coordination timelines to show where simultaneous motion appears and why it may compete for attention.

## Public site

The planned GitHub Pages URL is:

`https://oliviatyu.github.io/vscode-motion/`

The public build includes:

- Findings
- Coordination scenarios and recordings
- Motion principles
- Recommended next steps

It excludes the hidden Inventory, hidden research tables, editing dialog, and local Component Explorer links.

## Run the full local version

The local version retains developer references to Component Explorer.

```bash
python3 server.py
```

Open `http://localhost:4173/`.

Component Explorer references require the VS Code Component Explorer to be running separately on `http://localhost:5123/`. The audit and its recordings work without it.

## Build the public version

Node.js 22 or newer is recommended. No npm packages need to be installed.

```bash
npm run build
```

The generated site is written to `_site/`. To preview it locally:

```bash
npm run preview
```

Then open `http://localhost:4174/`.

## Publishing

The included GitHub Actions workflow builds `_site/` and deploys it to GitHub Pages whenever the `main` branch is pushed.

Before the first publish:

1. Review all screenshots and recordings for information that should not be public.
2. Create a public repository named `vscode-motion` under the `oliviatyu` account.
3. Push the reviewed `main` branch.
4. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not selected automatically.

Visitor changes are stored only in that visitor's browser and are not shared with other visitors.
