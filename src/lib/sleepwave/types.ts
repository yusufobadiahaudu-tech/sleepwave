export type SoundCategory = "Nature" | "Focus" | "Night";

export type SoundDefinition = {
  id: string;
  name: string;
  category: SoundCategory;
  free: boolean;
  color: string;
  file: string;
  blurb: string;
};

export type MixLayer = {
  id: string;
  volume: number;
};

export type SavedMix = {
  id: string;
  name: string;
  layers: MixLayer[];
  createdAt: number;
};

export type SessionState = {
  layers: MixLayer[];
  volumes: Record<string, number>;
};
