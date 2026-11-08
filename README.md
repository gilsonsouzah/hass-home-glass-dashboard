# Home Glass Dashboard

<img src="https://raw.githubusercontent.com/gilsonsouzah/hass-home-glass-dashboard/main/custom_components/home_glass/brand/icon.png" alt="Home Glass" width="128">

An iOS 26 "Liquid Glass" style dashboard for Home Assistant, generated automatically from your areas and devices. No YAML, no Mushroom, no card-mod.

## Install (HACS)

1. HACS → ⋮ → Custom repositories → add `https://github.com/gilsonsouzah/hass-home-glass-dashboard` (category **Integration**).
2. Install **Home Glass Dashboard** and restart Home Assistant.
3. Settings → Devices & services → Add integration → **Home Glass Dashboard**.
4. Settings → Dashboards → Add dashboard → pick **Home Glass**.

The integration serves and registers the frontend bundle itself; there is no Lovelace resource to add.

### Coming from Apple Home Dashboard

Dashboards using `custom:apple-home-strategy` keep working, with their saved customizations. Remove the old `apple-home-dashboard.js` resource and plugin from HACS after installing this one.

## Credits

Based on [nitaybz/apple-home-dashboard](https://github.com/nitaybz/apple-home-dashboard) (MIT).
