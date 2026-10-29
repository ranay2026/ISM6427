const DEFAULT = { name: "Delray Beach", lat: 26.4615, lon: -80.0728 };
const NAME = "Raquel";

const greet = (hour) =>
  hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

// Pick an emoji from the NWS short forecast text
function icon(text, isDay = true) {
  const t = text.toLowerCase();
  if (t.includes("thunder")) return "⛈️";
  if (t.includes("snow") || t.includes("sleet") || t.includes("flurr")) return "🌨️";
  if (t.includes("drizzle")) return "🌦️";
  if (t.includes("rain") || t.includes("shower")) return "🌧️";
  if (t.includes("fog") || t.includes("haze") || t.includes("smoke")) return "🌫️";
  if (t.includes("partly") || t.includes("mostly sunny") || t.includes("mostly clear")) return isDay ? "⛅" : "☁️";
  if (t.includes("cloud") || t.includes("overcast")) return "☁️";
  return isDay ? "☀️" : "🌙";
}

const $ = (id) => document.getElementById(id);
const toF = (c) => Math.round((c * 9) / 5 + 32);
// NWS times carry the location's UTC offset, so the hour in the string is local
const localHour = (iso) => Number(iso.slice(11, 13));
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function loadWeather({ name, lat, lon }) {
  $("place").textContent = name;
  $("condition").textContent = "Loading…";

  try {
    const point = await getJSON(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const [daily, hourly] = await Promise.all([
      getJSON(point.properties.forecast),
      getJSON(point.properties.forecastHourly),
    ]);
    render(daily.properties.periods, hourly.properties.periods);
  } catch (err) {
    $("condition").textContent = "Couldn't load weather. NWS covers US locations only.";
    console.error(err);
  }
}

function render(periods, hours) {
  const now = hours[0];
  document.body.classList.toggle("night", !now.isDaytime);

  const high = periods.find((p) => p.isDaytime);
  const low = periods.find((p) => !p.isDaytime);

  $("greeting").textContent = `${greet(localHour(now.startTime))}, ${NAME}`;
  $("temp").textContent = `${now.temperature}°`;
  $("condition").textContent = now.shortForecast;
  $("hilo").textContent = `H:${high.temperature}°  L:${low.temperature}°`;
  $("humidity").textContent = `${now.relativeHumidity.value}%`;
  $("wind").textContent = `${now.windSpeed} ${now.windDirection}`;
  $("rain").textContent = `${now.probabilityOfPrecipitation.value ?? 0}%`;
  $("dewpoint").textContent = `${toF(now.dewpoint.value)}°`;

  $("hourly").innerHTML = hours.slice(0, 24).map((h, i) => {
    const label = i === 0 ? "Now" : hourLabel(localHour(h.startTime));
    return `<div class="hour"><span>${label}</span><span class="icon">${icon(h.shortForecast, h.isDaytime)}</span><span>${h.temperature}°</span></div>`;
  }).join("");

  // NWS returns separate day and night periods; merge them into one row per date
  const days = [];
  for (const p of periods) {
    const date = p.startTime.slice(0, 10);
    let day = days.find((d) => d.date === date);
    if (!day) days.push((day = { date }));
    if (p.isDaytime) Object.assign(day, { hi: p.temperature, icon: icon(p.shortForecast) });
    else Object.assign(day, { lo: p.temperature, icon: day.icon || icon(p.shortForecast, false) });
  }

  $("daily").innerHTML = days.slice(0, 7).map((d, i) => {
    // Late in the day NWS only has tonight left for the first date
    const label = i > 0 ? new Date(`${d.date}T12:00`).toLocaleDateString([], { weekday: "short" })
      : d.hi == null ? "Tonight" : "Today";
    const range = d.hi == null ? `${d.lo}°`
      : `<span class="lo">${d.lo ?? "--"}°</span>${d.hi}°`;
    return `<li><span>${label}</span><span class="icon">${d.icon}</span><span class="range">${range}</span></li>`;
  }).join("");
}

// NWS has no city search, so Open-Meteo's geocoder turns a name into coordinates (US only)
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const { results } = await getJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&countryCode=US`
    );
    if (!results?.length) {
      $("condition").textContent = `No US results for "${q}"`;
      return;
    }
    const r = results[0];
    $("query").value = "";
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
  } catch (err) {
    $("condition").textContent = "Search failed.";
    console.error(err);
  }
});

function setTheme(value) {
  document.documentElement.dataset.theme = value;
  document.querySelectorAll("#theme button").forEach((b) => {
    b.setAttribute("aria-checked", b.dataset.value === value);
  });
  try { localStorage.setItem("theme", value); } catch (e) {}
}

$("theme").addEventListener("click", (e) => {
  if (e.target.dataset.value) setTheme(e.target.dataset.value);
});

setTheme(document.documentElement.dataset.theme || "system");
loadWeather(DEFAULT);
