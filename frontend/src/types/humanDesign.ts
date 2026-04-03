export interface HumanDesignActivation {
  planet: string;
  longitude: number;
  side: 'personality' | 'design';
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
  summary: string;
  label: string;
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
  activations: {
    personality: HumanDesignActivation[];
    design: HumanDesignActivation[];
  };
  gates: HumanDesignGateSummary[];
  statistics: {
    defined_centers: number;
    defined_channels: number;
    active_gates: number;
  };
}