# N. Shuvodeep Singha Portfolio

A premium dark-themed personal portfolio website for a young Manipuri folk artist, Pena musician, singer, and aspiring multi-instrumentalist.

## Project structure

- `index.html` — semantic page structure and portfolio content
- `style.css` — all site styling, layout, dark theme, and responsive design
- `script.js` — mobile navigation, scroll reveal behavior, and form UI behavior
- `assets/images/` — local placeholder image assets

## Run locally

### Option 1: VS Code Live Server

1. Open the project folder in Visual Studio Code.
2. Install the Live Server extension if it is not already installed.
3. Open `index.html`.
4. Right-click the file and choose **Open with Live Server**.
5. Or click the **Go Live** button in the status bar.

### Option 2: Python local server

From the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Replace placeholder images

1. Open the `assets/images/` folder.
2. Replace any SVG placeholder file with your own image.
3. Keep the same filename or update the corresponding `src` path in `index.html`.
4. Use descriptive `alt` text for accessibility.

Recommended image size:
- Portrait: 1200x1400 px
- Gallery images: 1200x1600 px or similar
- Keep files compressed for faster loading.

## Update personal information

Edit the text in `index.html` to change:
- Name
- Short introduction
- About content
- School name
- Social links
- Contact content

Example:
- Hero heading: `N. SHUVODEEP SINGHA`
- School: `Tetaigaon Rashid Uddin High School`
- Social URLs: the link targets in the social and contact sections

## Publishing in the future

When you are ready to publish:

1. Upload the project folder to any static hosting service (GitHub Pages, Netlify, Vercel, or similar).
2. Ensure all image paths remain relative to the root folder.
3. If you use custom domains, update the site configuration in the hosting platform.
4. Keep the website fully static since there is no backend requirement.

## Notes

- The site is intentionally dark-only as requested.
- No theme switcher is included.
- Placeholder content is used where personal or media details are not yet available.
