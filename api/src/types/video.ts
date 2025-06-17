export interface VideoSettings {
  startTime?: number;
  endTime?: number;
  fps?: number;
  quality?: 'low' | 'medium' | 'high';
  width?: number;
  height?: number;
} 