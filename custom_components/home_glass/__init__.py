"""Home Glass Dashboard: serves and registers the dashboard strategy bundle."""
from __future__ import annotations

import json
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import BUNDLE, DOMAIN, URL_BASE

FRONTEND_DIR = Path(__file__).parent / "frontend"


def _bundle_url() -> str:
    version = json.loads((Path(__file__).parent / "manifest.json").read_text())["version"]
    # The version query busts the browser cache on every release.
    return f"{URL_BASE}/{BUNDLE}?v={version}"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not hass.data.get(DOMAIN):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(FRONTEND_DIR), cache_headers=False)]
        )
        hass.data[DOMAIN] = await hass.async_add_executor_job(_bundle_url)
    add_extra_js_url(hass, hass.data[DOMAIN])
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # ponytail: the static path can't be unregistered at runtime; it stays until restart.
    remove_extra_js_url(hass, hass.data[DOMAIN])
    return True
