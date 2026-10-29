# ISM6427 — Weather

A simple glassmorphic weather app powered by the [National Weather Service API](https://www.weather.gov/documentation/services-web-api). It defaults to Delray Beach, FL, and you can search any US city. NWS has no city search, so the lookup from city name to coordinates uses the Open-Meteo geocoder.

Plain HTML/CSS/JS, so there is no build step. On Netlify, leave the build command empty and set the publish directory to the repo root.
