import { localize } from '../../utils/LocalizationService';
import { escapeHtml } from '../../utils/html';
import { stepTemperature } from '../../utils/thermostat';
import {
  COLOR_PRESETS,
  Timers,
  clamp,
  climateControls,
  colorTempKelvin,
  coverControls,
  coverPosition,
  createRateLimiter,
  createSyncGate,
  fanControls,
  fanPercentage,
  lightBrightnessCall,
  lightControls,
  matchesPreset,
  mediaControls,
  brightnessPercent,
  sheetKind,
  volumePercent,
} from './quickControls';
import { getQuickControlsStyles } from './quickControlsStyles';

type HassState = { state: string; attributes: Record<string, any> };

export interface SheetOptions {
  entityId: string;
  getHass: () => any;
  describe: (state: HassState) => string;
  openMoreInfo: () => void;
  returnFocus: () => HTMLElement | null;
  onClosed: () => void;
}

export interface QuickControlsSheet {
  sync: () => void;
  close: (restoreFocus?: boolean) => void;
}

interface Control {
  el: HTMLElement;
  update: (state: HassState, force: boolean) => void;
  dispose?: () => void;
}

const T = (key: string, fallback: string) => localize(`quick_controls.${key}`, fallback);

const humanize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');

const HVAC_FALLBACK: Record<string, string> = {
  off: 'Off',
  heat: 'Heat',
  cool: 'Cool',
  heat_cool: 'Auto',
  auto: 'Auto',
  dry: 'Dry',
  fan_only: 'Fan',
};

const hvacLabel = (mode: string) => T(`hvac.${mode}`, HVAC_FALLBACK[mode] ?? humanize(mode));

const COLOR_FALLBACK: Record<string, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
};

function html(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  vertical?: boolean;
  variant?: string;
  format: (value: number) => string;
  send: (value: number) => void;
}

interface Slider extends Control {
  set: (value: number, force?: boolean) => void;
}

/** Native range input under a glass fill: optimistic while dragging, throttled sends, final value on release, hass values deferred until it settles. */
function createSlider(opts: SliderOptions, timers?: Timers): Slider {
  const { min, max, step, vertical } = opts;
  const el = html(`
    <div class="slider-block ${vertical ? 'vertical' : ''} ${escapeHtml(opts.variant ?? '')}">
      <div class="slider-head"><span>${escapeHtml(opts.label)}</span><output></output></div>
      <div class="slider">
        <div class="slider-fill"></div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${min}" aria-label="${escapeHtml(opts.label)}"${vertical ? ' aria-orientation="vertical"' : ''}>
      </div>
    </div>`);
  const input = el.querySelector('input')!;
  const slider = el.querySelector<HTMLElement>('.slider')!;
  const output = el.querySelector('output')!;
  if (vertical) el.append(el.querySelector('.slider-head')!);

  const paint = (value: number) => {
    const shown = clamp(value, min, max);
    input.value = String(shown);
    slider.style.setProperty('--pct', `${((shown - min) / (max - min)) * 100}%`);
    const text = opts.format(shown);
    input.setAttribute('aria-valuetext', text);
    output.textContent = text;
  };

  const limiter = createRateLimiter<number>(opts.send, undefined, timers);
  const gate = createSyncGate<number>(paint, undefined, timers);
  const settle = () => gate.hold();

  input.addEventListener('pointerdown', () => gate.hold(Infinity));
  input.addEventListener('pointerup', settle);
  input.addEventListener('pointercancel', settle);
  input.addEventListener('input', () => {
    const value = Number(input.value);
    paint(value);
    limiter.push(value);
    if (!input.matches(':active')) settle();
  });
  input.addEventListener('change', () => {
    limiter.flush(Number(input.value));
    settle();
  });

  paint(min);
  return {
    el,
    update: () => undefined,
    set(value, force = false) {
      if (force) gate.hold(0);
      gate.external(value);
    },
    dispose() {
      limiter.cancel();
      gate.dispose();
    },
  };
}

function iconButton(className: string, icon: string, label: string, text = ''): HTMLButtonElement {
  return html(
    `<button type="button" class="${className}" aria-label="${escapeHtml(label)}"><ha-icon icon="${escapeHtml(icon)}"></ha-icon>${text ? `<span>${escapeHtml(text)}</span>` : ''}</button>`
  ) as HTMLButtonElement;
}

export function openQuickControls(opts: SheetOptions): QuickControlsSheet | null {
  const initial = opts.getHass()?.states?.[opts.entityId] as HassState | undefined;
  if (!initial) return null;

  const domain = opts.entityId.split('.')[0];
  const name = initial.attributes.friendly_name || opts.entityId.split('.')[1].replace(/_/g, ' ');

  const call = async (service: string, data: Record<string, unknown> = {}, svcDomain = domain) => {
    try {
      await opts.getHass().callService(svcDomain, service, { entity_id: opts.entityId, ...data });
    } catch (error) {
      console.error(`Quick controls: ${svcDomain}.${service} failed`, error);
      refresh(true);
    }
  };

  const controls: Control[] = [];
  const track = <C extends Control>(control: C): C => {
    controls.push(control);
    return control;
  };

  const buildLight = (state: HassState): Control[] => {
    const caps = lightControls(state.attributes);
    const out: Control[] = [];
    if (caps.brightness) {
      const slider = track(
        createSlider({
          label: T('brightness', 'Brightness'),
          min: 0,
          max: 100,
          step: 1,
          vertical: true,
          variant: 'hero',
          format: (v) => `${v}%`,
          send: (pct) => {
            const { service, data } = lightBrightnessCall(pct);
            call(service, data);
          },
        })
      );
      slider.update = (s, force) => slider.set(brightnessPercent(s.state, s.attributes), force);
      out.push(slider);
    }
    if (caps.colorTemp) {
      const range = caps.colorTemp;
      const slider = track(
        createSlider({
          label: T('color_temperature', 'Color temperature'),
          min: range.min,
          max: range.max,
          step: 50,
          variant: 'kelvin',
          format: (v) => `${v} K`,
          send: (kelvin) => call('turn_on', { color_temp_kelvin: kelvin }),
        })
      );
      slider.update = (s, force) => slider.set(colorTempKelvin(s.attributes, range), force);
      out.push(slider);
    }
    if (caps.colors) {
      const row = html(`<div class="presets" role="group" aria-label="${escapeHtml(T('colors', 'Colors'))}"></div>`);
      const buttons = COLOR_PRESETS.map((preset) => {
        const label = T(`color.${preset.id}`, COLOR_FALLBACK[preset.id]);
        const button = html(
          `<button type="button" class="swatch" style="--swatch: var(--hg-color-${preset.id})" aria-label="${escapeHtml(label)}" aria-pressed="false"></button>`
        ) as HTMLButtonElement;
        button.addEventListener('click', () => call('turn_on', { hs_color: preset.hs }));
        row.append(button);
        return button;
      });
      out.push({
        el: row,
        update: (s) =>
          COLOR_PRESETS.forEach((preset, i) =>
            buttons[i].setAttribute('aria-pressed', String(s.state === 'on' && matchesPreset(s.attributes, preset)))
          ),
      });
    }
    return out;
  };

  const buildCover = (state: HassState): Control[] => {
    const caps = coverControls(state.attributes);
    if (caps.position) {
      const slider = track(
        createSlider({
          label: T('position', 'Position'),
          min: 0,
          max: 100,
          step: 1,
          variant: 'wide',
          format: (v) => `${v}%`,
          send: (position) => call('set_cover_position', { position }),
        })
      );
      slider.update = (s, force) => slider.set(coverPosition(s.state, s.attributes), force);
      return [slider];
    }
    const actions: [boolean, string, string, string, string][] = [
      [caps.open, 'open_cover', 'mdi:arrow-up', 'open', 'Open'],
      [caps.stop, 'stop_cover', 'mdi:stop', 'stop', 'Stop'],
      [caps.close, 'close_cover', 'mdi:arrow-down', 'cover_close', 'Close'],
    ];
    const row = html('<div class="button-row"></div>');
    actions
      .filter(([supported]) => supported)
      .forEach(([, service, icon, key, fallback]) => {
        const label = T(key, fallback);
        const button = iconButton('action-btn', icon, label, label);
        button.addEventListener('click', () => call(service));
        row.append(button);
      });
    return row.children.length ? [{ el: row, update: () => undefined }] : [];
  };

  const buildFan = (state: HassState): Control[] => {
    const caps = fanControls(state.attributes);
    const out: Control[] = [];
    if (caps.speed) {
      const slider = track(
        createSlider({
          label: T('speed', 'Speed'),
          min: 0,
          max: 100,
          step: caps.step,
          variant: 'wide',
          format: (v) => `${v}%`,
          send: (percentage) => call('set_percentage', { percentage }),
        })
      );
      slider.update = (s, force) => slider.set(fanPercentage(s.state, s.attributes), force);
      out.push(slider);
    }
    if (caps.oscillate) {
      const label = T('oscillate', 'Oscillate');
      const toggle = html(
        `<button type="button" class="toggle-row" role="switch" aria-checked="false"><span>${escapeHtml(label)}</span><span class="switch" aria-hidden="true"></span></button>`
      ) as HTMLButtonElement;
      toggle.addEventListener('click', () => {
        const next = toggle.getAttribute('aria-checked') !== 'true';
        toggle.setAttribute('aria-checked', String(next));
        call('oscillate', { oscillating: next });
      });
      out.push({ el: toggle, update: (s) => toggle.setAttribute('aria-checked', String(s.attributes.oscillating === true)) });
    }
    return out;
  };

  const buildClimate = (state: HassState): Control[] => {
    const caps = climateControls(state.attributes);
    const out: Control[] = [];
    if (caps.target) {
      const { min, max, step } = caps.target;
      const label = T('target_temperature', 'Target temperature');
      const stepper = html(`
        <div class="stepper" role="group" aria-label="${escapeHtml(label)}">
          <div class="stepper-value"><output dir="ltr"></output></div>
        </div>`);
      const output = stepper.querySelector('output')!;
      const down = iconButton('step-btn', 'mdi:minus', T('decrease', 'Decrease'));
      const up = iconButton('step-btn', 'mdi:plus', T('increase', 'Increase'));
      stepper.prepend(down);
      stepper.append(up);

      let target = caps.target.value;
      let commitTimer: number | undefined;
      const gate = createSyncGate<number>((value) => {
        target = value;
        output.textContent = `${value}°`;
      });
      const nudge = (direction: number) => {
        target = stepTemperature(target, direction, step, min, max);
        output.textContent = `${target}°`;
        gate.hold(Infinity);
        window.clearTimeout(commitTimer);
        commitTimer = window.setTimeout(() => {
          call('set_temperature', { temperature: target });
          gate.hold();
        }, 500);
      };
      down.addEventListener('click', () => nudge(-1));
      up.addEventListener('click', () => nudge(1));
      output.textContent = `${target}°`;
      out.push({
        el: stepper,
        update: (s, force) => {
          const value = climateControls(s.attributes).target?.value;
          if (value === undefined) return;
          if (force) gate.hold(0);
          gate.external(value);
        },
        dispose: () => {
          window.clearTimeout(commitTimer);
          gate.dispose();
        },
      });
    }
    if (caps.modes.length) {
      const group = html(`<div class="segmented" role="group" aria-label="${escapeHtml(T('hvac_mode', 'Mode'))}"></div>`);
      const buttons = caps.modes.map((mode) => {
        const button = html(
          `<button type="button" data-mode="${escapeHtml(mode)}" aria-pressed="false">${escapeHtml(hvacLabel(mode))}</button>`
        ) as HTMLButtonElement;
        button.addEventListener('click', () => {
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
          call('set_hvac_mode', { hvac_mode: mode });
        });
        group.append(button);
        return button;
      });
      out.push({
        el: group,
        update: (s) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === s.state))),
      });
    }
    return out;
  };

  const buildMedia = (state: HassState): Control[] => {
    const caps = mediaControls(state.attributes);
    const out: Control[] = [];
    if (caps.volume) {
      const slider = track(
        createSlider({
          label: T('volume', 'Volume'),
          min: 0,
          max: 100,
          step: 1,
          variant: 'wide',
          format: (v) => `${v}%`,
          send: (pct) => call('volume_set', { volume_level: pct / 100 }),
        })
      );
      slider.update = (s, force) => slider.set(volumePercent(s.attributes), force);
      out.push(slider);
    }
    if (caps.previous || caps.next || caps.playPause) {
      const row = html('<div class="transport"></div>');
      let playButton: HTMLButtonElement | undefined;
      if (caps.previous) {
        const b = iconButton('transport-btn', 'mdi:skip-previous', T('previous', 'Previous'));
        b.addEventListener('click', () => call('media_previous_track'));
        row.append(b);
      }
      if (caps.playPause) {
        playButton = iconButton('transport-btn primary', 'mdi:play', T('play', 'Play'));
        playButton.addEventListener('click', () => call('media_play_pause'));
        row.append(playButton);
      }
      if (caps.next) {
        const b = iconButton('transport-btn', 'mdi:skip-next', T('next', 'Next'));
        b.addEventListener('click', () => call('media_next_track'));
        row.append(b);
      }
      out.push({
        el: row,
        update: (s) => {
          if (!playButton) return;
          const playing = s.state === 'playing';
          playButton.setAttribute('aria-label', playing ? T('pause', 'Pause') : T('play', 'Play'));
          playButton.querySelector('ha-icon')!.setAttribute('icon', playing ? 'mdi:pause' : 'mdi:play');
        },
      });
    }
    return out;
  };

  const BUILDERS: Record<string, ((state: HassState) => Control[]) | undefined> = {
    light: buildLight,
    cover: buildCover,
    fan: buildFan,
    climate: buildClimate,
    media_player: buildMedia,
  };

  const host = document.createElement('div');
  host.className = 'hg-quick-controls-host';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${getQuickControlsStyles()}</style>
    <div class="backdrop">
      <div class="sheet hg-glass--thick" role="dialog" aria-modal="true" aria-labelledby="qc-title">
        <header class="sheet-header">
          <div class="titles">
            <h2 id="qc-title">${escapeHtml(name)}</h2>
            <div class="sheet-state"></div>
          </div>
          <button type="button" class="pill details-btn">${escapeHtml(T('details', 'Details'))}</button>
          <button type="button" class="close-btn" aria-label="${escapeHtml(T('close', 'Close'))}"><ha-icon icon="mdi:close"></ha-icon></button>
        </header>
        <div class="sheet-body ${escapeHtml(sheetKind(domain))}"></div>
      </div>
    </div>`;

  const body = root.querySelector<HTMLElement>('.sheet-body')!;
  const stateEl = root.querySelector<HTMLElement>('.sheet-state')!;
  const built = (BUILDERS[domain] ?? (() => []))(initial);
  const bodyControls = built.length ? built : [];
  bodyControls.forEach((control) => {
    if (!controls.includes(control)) controls.push(control);
    body.append(control.el);
  });
  if (!bodyControls.length) {
    const open = html(`<button type="button" class="pill wide-btn">${escapeHtml(T('open_details', 'Open details'))}</button>`);
    open.addEventListener('click', () => {
      opts.openMoreInfo();
      close(false);
    });
    body.append(open);
  }

  function refresh(force = false) {
    const state = opts.getHass()?.states?.[opts.entityId] as HassState | undefined;
    if (!state) {
      close();
      return;
    }
    stateEl.textContent = opts.describe(state);
    controls.forEach((control) => control.update(state, force));
  }

  let closed = false;
  function close(restoreFocus = true) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown, true);
    controls.forEach((control) => control.dispose?.());
    host.remove();
    opts.onClosed();
    if (restoreFocus) opts.returnFocus()?.focus();
  }

  const focusables = () =>
    Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const active = root.activeElement as HTMLElement | null;
    const index = active ? items.indexOf(active) : -1;
    const last = items.length - 1;
    if (e.shiftKey && index <= 0) {
      e.preventDefault();
      items[last].focus();
    } else if (!e.shiftKey && (index === -1 || index === last)) {
      e.preventDefault();
      items[0].focus();
    }
  }

  root.querySelector('.backdrop')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close();
  });
  root.querySelector('.close-btn')!.addEventListener('click', () => close());
  root.querySelector('.details-btn')!.addEventListener('click', () => {
    opts.openMoreInfo();
    close(false);
  });
  document.addEventListener('keydown', onKeyDown, true);

  refresh(true);
  document.body.append(host);
  (body.querySelector<HTMLElement>('input, button') ?? root.querySelector<HTMLElement>('.close-btn'))?.focus();

  return { sync: () => refresh(false), close };
}
