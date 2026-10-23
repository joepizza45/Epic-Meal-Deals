# 🍔 Epic Meal Deals

**Find the best bang-for-your-buck places to eat near you.**

Type in your city, address, or ZIP (or tap **🎯 Near me**), set how much you want to spend per meal, and Epic Meal Deals shows you:

- 🏆 **Best meals for your budget** – the most food per dollar near you, in your price range.
- 🍴 **Bang-for-buck spots** – restaurants within 30 miles, ranked by a 0–100 *Bang/Buck* score, each with the best meals to order for your budget.
- 🗺️ **A map** of every spot, with directions, reviews/photos, menu, website, and phone links.

No sign-up and no API keys. It's a static website (plain HTML, CSS, and JavaScript).

---

## ✨ Features

| Feature | What it does |
| --- | --- |
| 📍 Location search | City, address, or ZIP, or use your device's location |
| 💵 Price range | Presets (*Cheap eats*, *Everyday*, *Treat yourself*) or a custom min/max per meal |
| 🚗 Distance | Search radius from 1 to 30 miles |
| 🏆 Meal picks | Top 12 meals ranked by how filling they are per dollar, with variety across cuisines and chains |
| 🍴 Ranked spots | Sort by best value, closest, or cheapest meal; filter by cuisine; show only local (non-chain) spots |
| ⭐ Local gems | Independent spots in high-value cuisines (taquerias, phở, halal, pupuserías, and more) get a boost |
| 👨‍👩‍👧 Feeds a crew | Family meals and whole pizzas show the per-person price |
| 🔗 Shareable links | Every search updates the URL (`?q=Austin, TX&min=0&max=15&r=30`) so you can send it to a friend |
| 📅 Daily deal tip | A different deal tip for each day of the week (Taco Tuesday, anyone?) |

## 🧮 How the Bang/Buck score works

Each place gets a score from 0 to 100:

```
score = 45% × place value      (how good this kind of place or chain usually is for the money)
      + 40% × best meal value  (how filling its best in-budget meal is per dollar, per person)
      + 15% × proximity        (closer is better)
      + a small bonus for local gems
```

- **Meal value** = fullness (1 = snack, 5 = you won't need dinner) ÷ price per person.
- **Place value** comes from a hand-built food knowledge base in [`js/data.js`](js/data.js) that covers about 30 cuisine types and more than 45 chains known for deals (Costco food court, Little Caesars, Taco Bell, Waffle House, In-N-Out, and others).
- A place only shows up if at least one of its typical meals fits your price range.

## ⚠️ Prices are estimates

Restaurant locations are real (from OpenStreetMap). **Menu prices are not live.** They're typical US prices for that kind of place or that chain's well-known deals, and they vary by location and change over time. Check the menu (each spot links to reviews, photos, and its website) before you go.

## 🚀 Run it locally

You don't need to install anything. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly also mostly works, but some browsers block location access on `file://` pages.)

## 🌍 Put it online (free) with GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then click **Save**.
4. In a minute your site is live at `https://<your-username>.github.io/<repo-name>/`.

Netlify, Vercel, and Cloudflare Pages also work: drag and drop the folder, no build command needed.

## 🗂️ Project structure

```
index.html          Page layout (hero search "order ticket", results, map)
css/styles.css      Food theme: diner colors, checkered tablecloth, menu-style cards
js/data.js          Food knowledge base: cuisines, chains, typical meals and prices, daily tips
js/app.js           Geocoding, restaurant lookup, scoring, rendering, map
assets/favicon.svg  Burger icon
```

## 🔌 Data sources (all free, no keys)

- **[OpenStreetMap](https://www.openstreetmap.org/)** via the **[Overpass API](https://overpass-api.de/)** for restaurant locations, cuisines, hours, and websites. The site searches in widening rings (3 → 8 → 15 → 30 mi) so busy cities return the *closest* spots first. If the main server is busy, it falls back to mirror servers.
- **[Nominatim](https://nominatim.org/)** to turn a city or ZIP into map coordinates.
- **[Leaflet](https://leafletjs.com/)** with OpenStreetMap tiles for the map.

These are community services with fair-use limits, which is fine for personal use and small sites. For a high-traffic site, use a hosted geocoder and tile provider.

## 🍟 Customize it

- **Add a chain or deal:** add an entry to `CHAINS` in `js/data.js`:
  ```js
  { match: /my burger shack/i, name: "My Burger Shack", emoji: "🍔", value: 85, meals: [
    { name: "Double smash combo", price: [8, 10], fill: 5, deal: "Tuesday 2-for-1" },
  ]},
  ```
- **Tune prices for your area:** edit the `price: [low, high]` ranges in `CUISINE_PROFILES`.
- **Change the look:** colors live at the top of `css/styles.css` (`--ketchup`, `--mustard`, `--lettuce`, …).

## 🛣️ Ideas for later

- Live prices and ratings from the Yelp Fusion or Google Places API (these need an API key and a small backend to keep the key secret)
- User-submitted deals and happy hours
- "Open now" filtering
- Saved favorite spots
