declare module "@mapbox/polyline" {
  export function encode(coordinates: [number, number][]): string;
  export function decode(str: string): [number, number][];
}
