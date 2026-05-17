Act as an expert frontend developer. I need to build a lightweight Single Page Application (SPA) using purely Vanilla JS, HTML5, and CSS3. The absolute priority is that this must work seamlessly on the free tier of GitHub Pages—no backend, no Node.js server, no bundlers, and no frameworks. Everything must run simply by opening `index.html`.

Project Concept:
The site will display phonetic alliterations found in the lyrics of two rock bands ('La Renga' and 'Patricio Rey y sus Redonditos de Ricota').

Core Requirements:
1. Data Structure: Create a `data.json` file with a hierarchical structure: Band -> Album -> Song -> Array of phrases.
2. UI & Filtering: The interface must feature two cascading `<select>` dropdowns. The first selects the Band. The second populates dynamically with that band's Albums. Selecting an album displays the songs and their lyrics below.
3. The Parsing Logic (Critical): The phrases in the JSON will use a custom markup syntax for highlighting: `{1:text}`, `{2:text}`, `{3:text}`, etc. (e.g., `"{1:L}{3:i}der {2:d}{3:ea}l{4:e}r"`). Write a robust JavaScript function using Regular Expressions that parses this string and converts it into HTML (`<span class="color-1">L</span>`).
4. Visual Rendering: In the CSS, define at least 5 color classes (`.color-1`, `.color-2`, etc.) using CSS Variables (`:root`) with a dark, rock-and-roll aesthetic (dark background, vibrant highlight colors).
5. Output: Generate the complete code for `index.html`, `style.css`, `app.js`, and `data.json`. Ensure all files are linked correctly for a static GitHub Pages environment.