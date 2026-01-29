
export enum Emotion {
  SHOCK = 'Shock',
  CURIOSITY = 'Curiosity',
  EXCITEMENT = 'Excitement',
  FEAR = 'Fear',
  URGENCY = 'Urgency'
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export interface ThumbnailImage {
  data: string;
  mimeType: string;
}

export interface ThumbnailRequest {
  title: string;
  niche: string;
  emotion: Emotion;
  ratio: AspectRatio;
  subjectDescription?: string;
  subjectImages: ThumbnailImage[];
}

export interface ThumbnailDesign {
  concept: {
    idea: string;
    hook: string;
  };
  mainText: string;
  visualElements: {
    expression: string;
    objects: string[];
    directionalElements: string[];
    backgroundStyle: string;
  };
  colorPalette: {
    primary: string;
    accent: string;
    text: string;
    background: string;
  };
  layoutInstructions: {
    textPlacement: string;
    subjectPlacement: string;
    arrowDirections: string[];
    negativeSpace: string;
  };
}

export interface GenerationResult {
  strategy: ThumbnailDesign;
  imageUrl?: string;
}
