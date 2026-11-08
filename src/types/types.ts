export interface EntityData {
  backgroundColor: string;
  isActive: boolean;
  iconColor: string;
  iconBackgroundColor: string;
  textColor: string;
  stateText: string;
  icon: string;
}

export interface CardConfig {
  type: string;
  entity: string;
  name?: string;
  domain?: string;
  is_tall?: boolean;
  area_id?: string;
  cards?: CardConfig[];
  section_type?: 'scenes' | 'cameras' | 'areas';
  last_used?: Date;
  default_icon?: string;
  camera_view?: 'live' | 'snapshot';
  refresh_interval?: number;
}

export interface Area {
  area_id: string;
  name: string;
}

export interface Entity {
  entity_id: string;
  area_id?: string;
  device_id?: string;
  hidden_by?: string | null;
  disabled_by?: string | null;
  entity_category?: string | null;
}

export interface Device {
  id: string;
  area_id?: string;
}

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    brightness?: number;
    rgb_color?: number[];
    temperature?: number;
    current_temperature?: number;
    hvac_action?: string;
    fan_mode?: string;
    volume_level?: number;
    media_title?: string;
    media_artist?: string;
    position?: number;
    tilt_position?: number;
    [key: string]: any;
  };
}

/** Section implemented by the sections-data owner: refreshes an already rendered section with new hass. */
export interface HassUpdatable {
  update?(hass: any): void | Promise<void>;
}
