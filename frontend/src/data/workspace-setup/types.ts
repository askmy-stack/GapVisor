export interface SetupRegion {
  id: string;
  name: string;
}

export interface SetupFrequency {
  id: string;
  title: string;
  plan: string;
  volume: string;
  description: string;
  recommended: boolean;
}

/** Values the setup wizard starts from. These seed editable state, never fixed content. */
export interface SetupDefaults {
  competitors: string[];
  categories: string[];
  regions: string[];
}
