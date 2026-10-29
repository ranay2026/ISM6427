const DEFAULT = { name: "Delray Beach", lat: 26.4615, lon: -80.0728 };

const CODES = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly Clear", "🌤️", "🌙"],
  2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"], 48: ["Fog", "🌫️", "🌫️"],
  51: ["Drizzle", "🌦️", "🌧️"], 53: ["Drizzle", "🌦️", "🌧️"], 55: ["Drizzle", "🌦️", "🌧️"],
  56: ["Freezing Drizzle", "🌧️", "🌧️"], 57: ["Freezing Drizzle", "🌧️", "🌧️"],
  61: ["Light Rain", "🌧️", "🌧️"], 63: ["Rain", "🌧️", "🌧️"], 65: ["Heavy Rain", "🌧️", "🌧️"],
  66: ["Freezing Rain", "🌧️", "🌧️"], 67: ["Freezing Rain", "🌧️", "🌧️"],
  71: ["Light Snow", "🌨️", "🌨️"], 73: ["Snow", "🌨️", "🌨️"], 75: ["Heavy Snow", "❄️", "❄️"],
  77: ["Snow Grains", "🌨️", "🌨️"],
  80: ["Showers", "🌦️", "🌧️"], 81: ["Showers", "🌦️", "🌧️"], 82: ["Heavy Showers", "⛈️", "⛈️"],
  85: ["Snow Showers", "🌨️", "🌨️"], 86: ["Snow Showers", "🌨️", "🌨️"],
  95: ["Thunderstorm", "⛈️", "⛈️"], 96: ["Thunderstorm", "⛈️", "⛈️"], 99: ["Thunderstorm", "⛈️", "⛈️"],
};

const describe = (code, isDay = 1) => {
  const [label, day, night] = CODES[code] || ["—", "🌡️", "🌡️"];
  return { label, icon: isDay ? day : night };
};

const NAME = "Raquel";

const greet = (hour) =>
  hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

const $ = (id) => document.getElementById(id);
const round = (n) => Math.round(n);

async function loadWeather({ name, lat, lon }) {
  $("place").textContent = name;
  $("condition").textContent = "Loading…";

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(res.statusText);
    render(await res.json());
  } catch (err) {
    $("condition").textContent = "Couldn't load weather.";
    console.error(err);
  }
}

function render({ current, hourly, daily }) {
  const now = describe(current.weather_code, current.is_day);
  document.body.classList.toggle("night", !current.is_day);

  // Greeting uses the searched location's local time
  $("greeting").textContent = `${greet(Number(current.time.slice(11, 13)))}, ${NAME}`;

  $("temp").textContent = `${round(current.temperature_2m)}°`;
  $("condition").textContent = now.label;
  $("hilo").textContent = `H:${round(daily.temperature_2m_max[0])}°  L:${round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${round(current.wind_speed_10m)} mph`;
  $("uv").textContent = round(daily.uv_index_max[0]);

  // Next 24 hours, starting from the current hour
  const start = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
  $("hourly").innerHTML = hourly.time.slice(start, start + 24).map((t, i) => {
    const j = start + i;
    const { icon } = describe(hourly.weather_code[j], hourly.is_day[j]);
    const hour = i === 0 ? "Now" : new Date(t).toLocaleTimeString([], { hour: "numeric" });
    return `<div class="hour"><span>${hour}</span><span class="icon">${icon}</span><span>${round(hourly.temperature_2m[j])}°</span></div>`;
  }).join("");

  $("daily").innerHTML = daily.time.map((d, i) => {
    const { icon } = describe(daily.weather_code[i]);
    const day = i === 0 ? "Today" : new Date(`${d}T12:00`).toLocaleDateString([], { weekday: "short" });
    return `<li><span>${day}</span><span class="icon">${icon}</span>
      <span class="range"><span class="lo">${round(daily.temperature_2m_min[i])}°</span>${round(daily.temperature_2m_max[i])}°</span></li>`;
  }).join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const { results } = await res.json();
    if (!results?.length) {
      $("condition").textContent = `No results for "${q}"`;
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
