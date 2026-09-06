export interface IconMotionEventDetail {
  duration?: number;
  milliseconds?: number;
  mode?: "house" | "semantic" | "generic";
  progress?: number;
}

export class IconMotionElement extends HTMLElement {
  autoplay: boolean;
  duration: number;
  loop: boolean;
  paused: boolean;
  presentation: "inline" | "cinematic";
  resultLabel?: string;
  readonly progress: number;
  play(): void;
  pause(): void;
  restart(): void;
  seek(milliseconds: number): number;
  setProgress(progress: number): number;
}

declare global {
  interface HTMLElementTagNameMap {
    "dl-sharing-baseline": IconMotionElement;
  }
}

export default IconMotionElement;
