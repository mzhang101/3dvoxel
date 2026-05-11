declare module '*?url' {
  const src: string;
  export default src;
}

declare module '*?raw' {
  const src: string;
  export default src;
}

declare module '*.jsonl?url' {
  const src: string;
  export default src;
}

declare module '*.json?url' {
  const src: string;
  export default src;
}

declare module 'three/examples/jsm/utils/BufferGeometryUtils' {
  import { BufferGeometry } from 'three';
  export function mergeGeometries(
    geometries: BufferGeometry[],
    useGroups?: boolean,
  ): BufferGeometry;
}
