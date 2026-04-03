export interface HumanDesignActivation {
  planet: string;
  longitude: number;
  retrograde: boolean;
  side: 'personality' | 'design' | 'transit';
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  name: string;
  keynote: string;
  description: string;
  label: string;
}

export interface HumanDesignCenter {
  key: string;
  name: string;
  defined: boolean;
  active_gates: number[];
  channels: string[];
  interpretation: string;
  encyclopedic: string;
}

export interface HumanDesignChannel {
  gates: [number, number];
  name: string;
  centers: [string, string];
  circuit: string;
  subcircuit: string;
  stream: string;
  summary: string;
  label: string;
  encyclopedic: string;
}

export interface HumanDesignHangingGate {
  gate: number;
  name: string;
  keynote: string;
  partner_gate: number | null;
  sides: string[];
  encyclopedic: string;
}

export interface HumanDesignGateSummary {
  gate: number;
  name: string;
  keynote: string;
  description: string;
  encyclopedic: string;
  personality: Array<{
    planet: string;
    line: number;
    color: number;
    tone: number;
    base: number;
    label: string;
  }>;
  design: Array<{
    planet: string;
    line: number;
    color: number;
    tone: number;
    base: number;
    label: string;
  }>;
}

export interface HumanDesignResult {
  meta: {
    engine_version: string;
    language: string;
    zodiac: string;
    ephemeris_source: string;
    calculated_at: string;
  };
  input: {
    birth_datetime_local: string;
    timezone_name: string | null;
    utc_offset: number;
    latitude: number;
    longitude: number;
  };
  metadata: {
    birth: {
      date: string;
      time: string;
      lat: number;
      lon: number;
      utc: number;
      jd_ut: number;
    };
    design: {
      date_utc: string;
      time_utc: string;
      date_local: string;
      time_local: string;
      jd_ut: number;
    };
  };
  overview: {
    type: string;
    strategy: string;
    signature: string;
    not_self: string;
    type_description: string;
    authority: string;
    authority_description: string;
    profile: string;
    profile_name: string;
    angle: string;
    description: string;
    definition: string;
  };
  incarnation_cross: {
    name: string;
    angle: string;
    description: string;
    gates: Array<{
      role: string;
      gate: number;
      line: number;
      name: string;
    }>;
  };
  centers: HumanDesignCenter[];
  channels: HumanDesignChannel[];
  hanging_gates: HumanDesignHangingGate[];
  activations: {
    personality: HumanDesignActivation[];
    design: HumanDesignActivation[];
  };
  gates: HumanDesignGateSummary[];
  person_summary: {
    identity: string;
    decision_making: string;
    strengths: string;
    risk_patterns: string;
    recommendations: string;
  };
  forecast: {
    sun_gate_periods_90d: Array<{
      start_date: string;
      end_date: string;
      gate: number;
      resonates_with_natal: boolean;
      focus: string;
    }>;
    moon_gate_windows_14d: Array<{
      date: string;
      gate: number;
      focus: string;
      resonates_with_natal: boolean;
    }>;
  };
  calculation_quality: {
    ephemeris_primary: string;
    ephemeris_fallback: string;
    max_longitude_delta_deg: number;
    design_offset_error_deg: number;
    earth_opposition_consistent: boolean;
    verification_passed: boolean;
    quality_level: string;
  };
  statistics: {
    defined_centers: number;
    defined_channels: number;
    active_gates: number;
    hanging_gates: number;
  };
}
