"""Home Glass Dashboard: serves and registers the dashboard strategy bundle."""
from __future__ import annotations

import hashlib
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import BUNDLE, DOMAIN, URL_BASE

FRONTEND_DIR = Path(__file__).parent / "frontend"


def _bundle_url() -> str:
    # A content hash, not the manifest version: HA's service worker caches by URL,
    # so any rebuilt bundle must get a new URL even within the same release.
    digest = hashlib.sha256((FRONTEND_DIR / BUNDLE).read_bytes()).hexdigest()[:12]
    return f"{URL_BASE}/{BUNDLE}?v={digest}"


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
