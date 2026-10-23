/* Epic Meal Deals — search, scoring and rendering. No build step, no API keys. */
(() => {
  "use strict";

  const NOMINATIM = "https://nominatim.openstreetmap.org";
  const OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];
  // Start a backup server if the previous one hasn't answered after this long.
  const MIRROR_STAGGER_MS = 4000;
  const OVERPASS_TIMEOUT_MS = 25000;
  // Search outward in rings so dense cities return the *closest* spots
  // instead of an arbitrary slice of a 30-mile circle.
  const RINGS_MI = [5, 15, 30];
  const ENOUGH_PLACES = 200;
  const PAGE_SIZE = 25;
  const METERS_PER_MILE = 1609.344;

  const $ = (id) => document.getElementById(id);
  const els = {
    form: $("search"), location: $("location"), geoBtn: $("geo-btn"),
    min: $("price-min"), max: $("price-max"), radius: $("radius"), radiusOut: $("radius-out"),
    presets: $("price-presets"), go: $("go-btn"), dayTip: $("day-tip"), orderNo: $("order-no"),
    results: $("results"), status: $("status"), rail: $("meal-rail"),
    list: $("spot-list"), chips: $("cuisine-chips"), sort: $("sort"), localOnly: $("local-only"),
    more: $("more-btn"), loading: $("loading"), loadingMsg: $("loading-msg"),
    loadingTime: $("loading-time"), cancel: $("cancel-btn"),
  };

  const state = {
    origin: null,      // { lat, lon, label }
    places: [],        // scored places with in-budget meals
    searchedMi: 0,
    cuisine: "all",
    shown: PAGE_SIZE,
    map: null, layer: null, markers: new Map(),
  };

  /* ---------- small helpers ---------- */

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

  function priceText(meal) {
    const [lo, hi] = meal.price;
    const whole = lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
    return whole;
  }

  function perPerson(meal) {
    const serves = meal.serves || 1;
    return { lo: meal.price[0] / serves, hi: meal.price[1] / serves, mid: (meal.price[0] + meal.price[1]) / 2 / serves };
  }

  const cheapest = (p) => Math.min(...p.meals.map((m) => perPerson(m).mid));

  function haversineMi(a, b) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function safeStorage(fn) { try { return fn(window.sessionStorage); } catch { return null; } }

  async function fetchWithTimeout(url, opts = {}, ms = 30000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const outer = opts.signal;
    if (outer) {
      if (outer.aborted) ctrl.abort();
      outer.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  let loadingTimer = null, loadingStart = 0;
  function setLoading(on, msg) {
    els.loading.hidden = !on;
    els.go.disabled = on;
    if (msg) els.loadingMsg.textContent = msg;
    if (on && !loadingTimer) {
      loadingStart = Date.now();
      els.loadingTime.textContent = "";
      loadingTimer = setInterval(() => {
        const secs = Math.round((Date.now() - loadingStart) / 1000);
        els.loadingTime.textContent = secs >= 5 ? `${secs}s — busy servers, hang tight…` : "";
      }, 1000);
    } else if (!on) {
      clearInterval(loadingTimer);
      loadingTimer = null;
    }
  }

  /* ---------- geocoding ---------- */

  async function geocode(q) {
    const url = `${NOMINATIM}/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
    const data = await fetchWithTimeout(url, { headers: { "Accept-Language": "en" } }, 15000);
    if (!data.length) throw new Error(`We couldn't find "${q}". Try a city and state, or a ZIP code.`);
    return { lat: +data[0].lat, lon: +data[0].lon, label: data[0].display_name.split(",").slice(0, 3).join(",") };
  }

  async function reverseGeocode(lat, lon) {
    try {
      const d = await fetchWithTimeout(`${NOMINATIM}/reverse?format=jsonv2&zoom=12&lat=${lat}&lon=${lon}`, {}, 10000);
      const a = d.address || {};
      return [a.city || a.town || a.village || a.suburb || a.county, a.state].filter(Boolean).join(", ") || "your location";
    } catch {
      return "your location";
    }
  }

  /* ---------- restaurant data (OpenStreetMap / Overpass) ---------- */

  function overpassQuery(lat, lon, meters) {
    const around = `(around:${Math.round(meters)},${lat},${lon})`;
    // Nodes + ways only (relations are rare for restaurants and slow to search).
    return `[out:json][timeout:20];(
      nw["amenity"~"^(restaurant|fast_food|food_court)$"]["name"]${around};
      nw["shop"="wholesale"]["brand"="Costco"]${around};
      nw["shop"="furniture"]["brand"="IKEA"]${around};
    );out center tags;`;
  }

  // Ask the main server first; if it's slow, race backup servers too and
  // take whichever answers first.
  async function overpass(query, signal) {
    const race = new AbortController();
    const onCancel = () => race.abort();
    signal?.addEventListener("abort", onCancel, { once: true });
    const attempts = OVERPASS_MIRRORS.map((url, i) => new Promise((resolve, reject) => {
      const start = () => {
        if (race.signal.aborted) return reject(new Error("cancelled"));
        fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
          signal: race.signal,
        }, OVERPASS_TIMEOUT_MS).then((data) => {
          // Overpass reports server-side timeouts as a 200 with a "remark".
          if (data.remark && !(data.elements || []).length) throw new Error(data.remark);
          resolve(data.elements || []);
        }).catch(reject);
      };
      setTimeout(start, i * MIRROR_STAGGER_MS);
    }));
    try {
      return await Promise.any(attempts);
    } catch {
      if (signal?.aborted) throw new Error("Search cancelled.");
      throw new Error("The free restaurant map servers are swamped right now. Wait a few seconds and try again, or try a smaller distance.");
    } finally {
      race.abort();
      signal?.removeEventListener("abort", onCancel);
    }
  }

  async function overpassSearch(origin, maxMi, signal) {
    const rings = RINGS_MI.filter((r) => r < maxMi).concat(maxMi);
    let elements = [], searched = 0;
    for (const mi of rings) {
      try {
        elements = await overpass(overpassQuery(origin.lat, origin.lon, mi * METERS_PER_MILE), signal);
      } catch (e) {
        // A wider ring failed but we already have nearby spots — use those.
        if (elements.length && !signal.aborted) break;
        throw e;
      }
      searched = mi;
      if (elements.length >= ENOUGH_PLACES) break;
    }
    return { elements, searched, source: "overpass" };
  }

  /*
   * Backup source: Nominatim's category search ("restaurant", "fast food")
   * inside map boxes. Max 50 results per box and 1 request/second, so we
   * search a tight box around you first, then four quadrants further out.
   */
  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("Search cancelled.")); }, { once: true });
  });

  function nominatimToElement(r) {
    const a = r.address || {};
    const tags = { ...(r.extratags || {}), name: r.name, [r.category]: r.type };
    if (a.house_number) tags["addr:housenumber"] = a.house_number;
    if (a.road) tags["addr:street"] = a.road;
    const city = a.city || a.town || a.village || a.suburb;
    if (city) tags["addr:city"] = city;
    return { type: r.osm_type, id: r.osm_id, lat: +r.lat, lon: +r.lon, tags };
  }

  async function nominatimSearch(origin, maxMi, signal) {
    const box = (cLat, cLon, halfMi) => {
      const dLat = halfMi / 69, dLon = halfMi / (69 * Math.cos(origin.lat * Math.PI / 180));
      return [cLon - dLon, cLat + dLat, cLon + dLon, cLat - dLat].map((n) => n.toFixed(5)).join(",");
    };
    const quadrants = (halfMi) => {
      const h = halfMi / 2, dLat = h / 69, dLon = h / (69 * Math.cos(origin.lat * Math.PI / 180));
      return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([y, x]) => box(origin.lat + y * dLat, origin.lon + x * dLon, h));
    };
    const plan = [{ boxes: [box(origin.lat, origin.lon, Math.min(3, maxMi))], mi: Math.min(3, maxMi) }];
    if (maxMi > 3) plan.push({ boxes: quadrants(Math.min(10, maxMi)), mi: Math.min(10, maxMi) });
    if (maxMi > 10) plan.push({ boxes: quadrants(maxMi), mi: maxMi, onlyIfFew: true });

    const found = new Map();
    let searched = 0, requests = 0;
    for (const step of plan) {
      if (step.onlyIfFew && found.size >= 120) break;
      for (const vb of step.boxes) {
        for (const q of ["restaurant", "fast food"]) {
          if (requests++) await sleep(1100, signal);
          const url = `${NOMINATIM}/search?format=jsonv2&limit=50&bounded=1&extratags=1&addressdetails=1`
            + `&q=${encodeURIComponent(q)}&viewbox=${vb}`;
          try {
            const rows = await fetchWithTimeout(url, { signal, headers: { "Accept-Language": "en" } }, 15000);
            for (const r of rows) if (r.name) found.set(`${r.osm_type}/${r.osm_id}`, nominatimToElement(r));
          } catch (e) {
            if (signal.aborted) throw new Error("Search cancelled.");
            if (!found.size && step === plan[0]) throw e;
          }
        }
      }
      searched = step.mi;
    }
    if (!found.size) throw new Error("No restaurants found nearby.");
    return { elements: [...found.values()], searched, source: "nominatim" };
  }

  // Run both sources at once. Overpass has better coverage, so prefer it, but
  // if the backup finishes first only wait a few more seconds for Overpass.
  async function findPlaces(origin, maxMi, signal) {
    const key = `emd2:${origin.lat.toFixed(3)},${origin.lon.toFixed(3)},${maxMi}`;
    const cached = safeStorage((s) => s.getItem(key));
    if (cached) { try { return JSON.parse(cached); } catch { /* ignore */ } }

    setLoading(true, `Sniffing out spots within ${maxMi} mi…`);
    const ctrl = new AbortController();
    const onCancel = () => ctrl.abort();
    signal.addEventListener("abort", onCancel, { once: true });
    const ov = overpassSearch(origin, maxMi, ctrl.signal);
    const nm = nominatimSearch(origin, maxMi, ctrl.signal);
    ov.catch(() => {}); nm.catch(() => {});
    let result;
    try {
      result = await Promise.any([ov, nm]);
      if (result.source === "nominatim") {
        setLoading(true, "Double-checking for more spots…");
        result = await Promise.race([ov, sleep(4000, ctrl.signal).then(() => result)]).catch(() => result);
      }
    } catch {
      if (signal.aborted) throw new Error("Search cancelled.");
      throw new Error("The free restaurant map servers aren't answering right now. Wait a minute and try again, or try a smaller distance.");
    } finally {
      ctrl.abort();
      signal.removeEventListener("abort", onCancel);
    }
    safeStorage((s) => s.setItem(key, JSON.stringify(result)));
    return result;
  }

  /* ---------- classification & scoring ---------- */

  function chainFor(tags) {
    const hay = `${tags.brand || ""} | ${tags.name || ""}`;
    return CHAINS.find((c) => c.match.test(hay)) || null;
  }

  function profileKeyFor(tags) {
    if (tags.amenity === "food_court") return "food_court";
    const cuisines = (tags.cuisine || "").toLowerCase().split(/[;,]/).map((s) => s.trim().replace(/\s+/g, "_"));
    for (const c of cuisines) if (CUISINE_MAP[c]) return CUISINE_MAP[c];
    for (const [re, key] of NAME_KEYWORDS) if (re.test(tags.name || "")) return key;
    return tags.amenity === "fast_food" ? "fast_food" : "american";
  }

  function mealValue(meal) {
    const ppp = Math.max(perPerson(meal).mid, 0.5);
    // fill 5 at ~$6.25/person = 100. Deals get a little nudge.
    return Math.min(100, (100 * (meal.fill / ppp)) / 0.8 + (meal.deal ? 4 : 0));
  }

  function inBudget(meal, min, max) {
    const p = perPerson(meal);
    return p.lo <= max && p.hi >= min;
  }

  function scorePlace(el, origin, budget, radiusMi) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (lat == null || !tags.name) return null;
    const distance = haversineMi(origin, { lat, lon });
    if (distance > radiusMi) return null;

    // Costco/IKEA came in as stores; only keep them via their chain entry.
    const chain = chainFor(tags);
    if (tags.shop && !chain) return null;

    const profileKey = tags.shop ? "food_court" : profileKeyFor(tags);
    const profile = CUISINE_PROFILES[profileKey];
    const source = chain || profile;
    const meals = source.meals
      .filter((m) => inBudget(m, budget.min, budget.max))
      .map((m) => ({ ...m, value: mealValue(m) }))
      .sort((a, b) => b.value - a.value);
    if (!meals.length) return null;

    const isLocal = !chain && !tags.brand;
    const gem = isLocal && profile.value >= 80;
    const proximity = 1 - distance / Math.max(radiusMi, 1);
    const score = Math.round(
      0.45 * source.value + 0.4 * meals[0].value + 0.15 * proximity * 100 + (gem ? 3 : 0));

    const addr = [[tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "), tags["addr:city"]]
      .filter(Boolean).join(", ");

    return {
      id: `${el.type}/${el.id}`,
      name: chain && tags.shop ? chain.name : tags.name,
      lat, lon, distance, score: Math.min(score, 99),
      chain, isLocal, gem,
      profileKey, cuisineLabel: profile.label,
      emoji: chain?.emoji || profile.emoji,
      meals, addr,
      website: tags.website || tags["contact:website"] || tags.url || "",
      menu: tags["website:menu"] || "",
      phone: tags.phone || tags["contact:phone"] || "",
      hours: tags.opening_hours || "",
      takeaway: tags.takeaway === "yes" || tags.takeaway === "only",
    };
  }

  /* ---------- rendering ---------- */

  function visiblePlaces() {
    let list = state.places;
    if (state.cuisine !== "all") list = list.filter((p) => p.profileKey === state.cuisine);
    if (els.localOnly.checked) list = list.filter((p) => p.isLocal);
    const sort = els.sort.value;
    const cmp = {
      score: (a, b) => b.score - a.score || a.distance - b.distance,
      distance: (a, b) => a.distance - b.distance,
      price: (a, b) => cheapest(a) - cheapest(b) || b.score - a.score,
    }[sort];
    return [...list].sort(cmp);
  }

  function renderStatus() {
    const n = state.places.length;
    const ringNote = state.searchedMi < +els.radius.value
      ? ` (lots of food nearby — showing the closest spots out to <strong>${state.searchedMi} mi</strong>)`
      : ` within <strong>${state.searchedMi} mi</strong>`;
    els.status.className = "status-bar";
    els.status.innerHTML = n
      ? `Found <strong>${n}</strong> spots with meals in your <strong>${money(+els.min.value)}–${money(+els.max.value)}</strong> range near <strong>${esc(state.origin.label)}</strong>${ringNote}.`
      : `No spots with meals in that range near <strong>${esc(state.origin.label)}</strong>. Try raising your max price or widening the distance.`;
  }

  function renderRail() {
    const seen = new Set();
    const perGroup = {};
    const picks = [];
    const candidates = [];
    for (const p of state.places) {
      for (const m of p.meals) {
        const prox = 1 - p.distance / Math.max(+els.radius.value, 1);
        candidates.push({ p, m, rank: m.value * 0.8 + prox * 20 + (p.gem ? 2 : 0) });
      }
    }
    candidates.sort((a, b) => b.rank - a.rank);
    for (const c of candidates) {
      // Keep the rail varied: one card per chain, two per cuisine, one per place.
      const group = c.p.chain ? "chain:" + c.p.chain.name : c.p.profileKey;
      const key = group + "|" + c.m.name;
      if (seen.has(key) || seen.has(c.p.id) || (perGroup[group] || 0) >= (c.p.chain ? 1 : 2)) continue;
      seen.add(key); seen.add(c.p.id);
      perGroup[group] = (perGroup[group] || 0) + 1;
      picks.push(c);
      if (picks.length === 12) break;
    }
    els.rail.innerHTML = picks.length ? picks.map(({ p, m }, i) => {
      const pp = perPerson(m);
      const serves = m.serves > 1 ? `<span class="per-person"> · ≈${money(+pp.mid.toFixed(2))}/person</span>` : "";
      return `<button class="meal-card" data-id="${esc(p.id)}" type="button">
        <span class="rank">${i + 1}</span>
        <span class="big-emoji">${p.emoji}</span>
        <span class="meal-name">${esc(m.name)}</span>
        <span class="price-tag">${priceText(m)}${serves}</span>
        <span class="meal-place">at ${esc(p.name)} · ${p.distance.toFixed(1)} mi</span>
        ${m.deal ? `<span class="deal-note">💡 ${esc(m.deal)}</span>` : ""}
      </button>`;
    }).join("") : `<div class="empty">No meals in this price range yet — try bumping up your max.</div>`;
  }

  function renderChips() {
    const counts = {};
    for (const p of state.places) counts[p.profileKey] = (counts[p.profileKey] || 0) + 1;
    const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    els.chips.innerHTML = [`<button class="chip ${state.cuisine === "all" ? "is-on" : ""}" data-c="all">All (${state.places.length})</button>`]
      .concat(keys.map((k) => {
        const pr = CUISINE_PROFILES[k];
        return `<button class="chip ${state.cuisine === k ? "is-on" : ""}" data-c="${k}">${pr.emoji} ${esc(pr.label)} (${counts[k]})</button>`;
      })).join("");
  }

  function spotHTML(p, i) {
    const meals = p.meals.slice(0, 3).map((m) => {
      const pp = perPerson(m);
      const per = m.serves > 1 ? ` <small>(≈${money(+pp.mid.toFixed(2))}/person)</small>` : "";
      return `<li><span>${esc(m.name)}</span><span class="dots"></span><span class="p">${priceText(m)}${per}</span></li>`;
    }).join("");
    const badges = [
      p.gem ? `<span class="badge gem">⭐ Local gem</span>` : "",
      p.chain ? `<span class="badge chain">Known deals</span>` : "",
      p.takeaway ? `<span class="badge">Takeout</span>` : "",
      p.meals.some((m) => m.serves > 1) ? `<span class="badge">Feeds a crew</span>` : "",
    ].join("");
    const q = encodeURIComponent(`${p.name} ${p.addr || ""}`.trim());
    const links = [
      `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">📸 Reviews & photos</a>`,
      `<a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank" rel="noopener">🧭 Directions</a>`,
      p.menu ? `<a href="${esc(p.menu)}" target="_blank" rel="noopener">📜 Menu</a>` : "",
      p.website ? `<a href="${esc(p.website)}" target="_blank" rel="noopener">🌐 Website</a>` : "",
      p.phone ? `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ""))}">📞 Call</a>` : "",
    ].join("");
    return `<li class="spot" id="spot-${esc(p.id.replace("/", "-"))}" data-id="${esc(p.id)}">
      <div class="spot-emoji" aria-hidden="true">${p.emoji}</div>
      <h3 class="spot-title"><button type="button" data-fly="${esc(p.id)}">${i + 1}. ${esc(p.name)}</button></h3>
      <div class="meter" title="Bang-for-buck score out of 100">
        <div class="meter-num">${p.score}</div>
        <div class="meter-label">Bang/Buck</div>
        <div class="meter-bar"><span style="width:${p.score}%"></span></div>
      </div>
      <div>
        <div class="spot-meta"><span>${esc(p.cuisineLabel)}</span><span>· ${p.distance.toFixed(1)} mi</span>${p.addr ? `<span>· ${esc(p.addr)}</span>` : ""}</div>
        ${p.hours ? `<div class="spot-meta">🕒 ${esc(p.hours)}</div>` : ""}
        <div class="badges">${badges}</div>
      </div>
      <ul class="spot-meals">${meals}</ul>
      <div class="spot-links">${links}</div>
    </li>`;
  }

  function renderList() {
    const list = visiblePlaces();
    const page = list.slice(0, state.shown);
    els.list.innerHTML = page.length ? page.map(spotHTML).join("")
      : `<li class="empty">Nothing matches these filters. Try “All” or turn off “Local spots only”.</li>`;
    els.more.hidden = list.length <= state.shown;
    renderMap(page);
  }

  function pinIcon(p, i) {
    const cls = p.score >= 80 ? "hi" : p.score >= 65 ? "mid" : "lo";
    return L.divIcon({ className: "", html: `<div class="pin ${cls}"><b>${i + 1}</b></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
  }

  function ensureMap() {
    if (state.map || typeof L === "undefined") return;
    state.map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
  }

  function renderMap(page) {
    ensureMap();
    if (!state.map) return;
    state.layer.clearLayers();
    state.markers.clear();
    const o = state.origin;
    L.marker([o.lat, o.lon], { icon: L.divIcon({ className: "", html: '<div class="you-pin">📍</div>', iconSize: [30, 30], iconAnchor: [15, 30] }), zIndexOffset: 1000 })
      .bindPopup("<b>You are here</b>").addTo(state.layer);
    page.forEach((p, i) => {
      const m = L.marker([p.lat, p.lon], { icon: pinIcon(p, i) })
        .bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.meals[0].name)} · ${priceText(p.meals[0])}<br>Score ${p.score} · ${p.distance.toFixed(1)} mi`)
        .on("click", () => highlight(p.id, false))
        .addTo(state.layer);
      state.markers.set(p.id, m);
    });
    const pts = page.map((p) => [p.lat, p.lon]).concat([[o.lat, o.lon]]);
    setTimeout(() => {
      state.map.invalidateSize();
      if (pts.length > 1) state.map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
      else state.map.setView([o.lat, o.lon], 12);
    }, 50);
  }

  function highlight(id, fly = true) {
    document.querySelectorAll(".spot.is-active").forEach((n) => n.classList.remove("is-active"));
    const card = document.querySelector(`.spot[data-id="${CSS.escape(id)}"]`);
    if (card) { card.classList.add("is-active"); if (!fly) card.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    const marker = state.markers.get(id);
    if (fly && marker && state.map) {
      state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 15));
      marker.openPopup();
      document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderAll() {
    renderStatus();
    renderRail();
    renderChips();
    renderList();
  }

  /* ---------- search flow ---------- */

  function readBudget() {
    let min = Math.max(0, +els.min.value || 0);
    let max = Math.max(1, +els.max.value || 15);
    if (min > max) [min, max] = [max, min];
    els.min.value = min; els.max.value = max;
    return { min, max };
  }

  function syncUrl() {
    const params = new URLSearchParams({ q: els.location.value.trim(), min: els.min.value, max: els.max.value, r: els.radius.value });
    history.replaceState(null, "", `${location.pathname}?${params}`);
  }

  let searchCtrl = null;

  async function runSearch(originOverride) {
    searchCtrl?.abort();
    searchCtrl = new AbortController();
    const signal = searchCtrl.signal;
    const budget = readBudget();
    const radiusMi = +els.radius.value;
    els.orderNo.textContent = String(Math.floor(Math.random() * 900) + 100);
    setLoading(true, "Finding you on the map…");
    try {
      const origin = originOverride || await geocode(els.location.value.trim());
      state.origin = origin;
      const { elements, searched } = await findPlaces(origin, radiusMi, signal);
      setLoading(true, "Crunching the numbers on every combo…");

      const byKey = new Map();
      for (const el of elements) {
        const p = scorePlace(el, origin, budget, radiusMi);
        if (!p) continue;
        // De-dupe the same place mapped as both a node and a building.
        const k = p.name.toLowerCase() + "|" + p.lat.toFixed(3) + "|" + p.lon.toFixed(3);
        if (!byKey.has(k)) byKey.set(k, p);
      }
      state.places = [...byKey.values()];
      state.searchedMi = searched;
      state.cuisine = "all";
      state.shown = PAGE_SIZE;
      els.results.hidden = false;
      renderAll();
      syncUrl();
      els.results.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      els.results.hidden = false;
      els.status.className = "status-bar is-error";
      els.status.innerHTML = `<strong>Uh-oh, kitchen trouble:</strong> ${esc(err.name === "AbortError" ? "The request timed out. Please try again." : err.message)}`;
      els.rail.innerHTML = ""; els.list.innerHTML = ""; els.chips.innerHTML = "";
      els.status.scrollIntoView({ behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  }

  /* ---------- events ---------- */

  els.form.addEventListener("submit", (e) => { e.preventDefault(); runSearch(); });

  els.geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) { alert("Your browser doesn't support location. Type your city instead."); return; }
    setLoading(true, "Locating you…");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const label = await reverseGeocode(lat, lon);
      els.location.value = label;
      runSearch({ lat, lon, label });
    }, () => {
      setLoading(false);
      alert("We couldn't get your location. Type your city or ZIP instead.");
    }, { timeout: 15000, maximumAge: 600000 });
  });

  els.cancel.addEventListener("click", () => { searchCtrl?.abort(); setLoading(false); });

  els.radius.addEventListener("input", () => { els.radiusOut.textContent = els.radius.value; });

  els.presets.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    els.presets.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === b));
    els.min.value = b.dataset.min; els.max.value = b.dataset.max;
  });
  [els.min, els.max].forEach((i) => i.addEventListener("input", () =>
    els.presets.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c.dataset.min === els.min.value && c.dataset.max === els.max.value))));

  els.chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.cuisine = b.dataset.c; state.shown = PAGE_SIZE;
    renderChips(); renderList();
  });
  els.sort.addEventListener("change", () => { state.shown = PAGE_SIZE; renderList(); });
  els.localOnly.addEventListener("change", () => { state.shown = PAGE_SIZE; renderList(); });
  els.more.addEventListener("click", () => { state.shown += PAGE_SIZE; renderList(); });

  els.list.addEventListener("click", (e) => { const b = e.target.closest("[data-fly]"); if (b) highlight(b.dataset.fly); });
  els.rail.addEventListener("click", (e) => {
    const b = e.target.closest(".meal-card");
    if (!b) return;
    // Make sure the place is on the current page of results before jumping to it.
    state.cuisine = "all"; els.localOnly.checked = false;
    const idx = visiblePlaces().findIndex((p) => p.id === b.dataset.id);
    if (idx >= state.shown) state.shown = idx + 1;
    renderChips(); renderList();
    highlight(b.dataset.id);
  });

  /* ---------- init ---------- */

  els.dayTip.textContent = DAY_TIPS[new Date().getDay()];
  const params = new URLSearchParams(location.search);
  if (params.get("q")) {
    els.location.value = params.get("q");
    if (params.get("min")) els.min.value = params.get("min");
    if (params.get("max")) els.max.value = params.get("max");
    if (params.get("r")) { els.radius.value = params.get("r"); els.radiusOut.textContent = els.radius.value; }
    els.max.dispatchEvent(new Event("input"));
    runSearch();
  }
})();
