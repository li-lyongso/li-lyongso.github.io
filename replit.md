# Tetoris Chaneru - Community App

## Overview
A client-side community/forum web application built with vanilla HTML, CSS, and JavaScript. Users can create posts, like, comment, join the community, search by tags, and more. All data is stored in the browser's localStorage.

## Project Architecture
- **index.html** - Main HTML page with post templates and layout
- **styles.css** - Full styling with responsive design
- **script.js** - All application logic (posts, comments, likes, members, search)

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no frameworks)
- localStorage for data persistence
- Static file serving via `serve` package

## Running
- Served via `npx serve -s . -l 5000` on port 5000
- Deployment configured as static site with public directory `.`
