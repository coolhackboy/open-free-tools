declare module "bwip-js" {
  type BarcodeOptions = {
    bcid: string;
    text: string;
    includetext?: boolean;
    scale?: number;
    height?: number;
  };
  export function toSVG(options: BarcodeOptions): string;
  const bwipjs: { toSVG: typeof toSVG };
  export default bwipjs;
}

declare module "three" {
  export const DoubleSide: number;
  export class BufferGeometry {
    setAttribute(name: string, attribute: unknown): void;
    setIndex(index: number[]): void;
    computeVertexNormals(): void;
  }
  export class Float32BufferAttribute {
    constructor(array: number[], itemSize: number);
  }
  export class Group {
    add(object: unknown): void;
    traverse(callback: (child: MeshLike) => void): void;
  }
  export class Mesh {
    constructor(geometry: unknown, material?: unknown);
  }
  export class MeshNormalMaterial {
    constructor(options?: { side?: number });
  }
  export class Points {
    constructor(geometry: unknown, material?: unknown);
  }
  export class PointsMaterial {
    constructor(options?: { size?: number; color?: number });
  }
  export class Scene {
    add(object: unknown): void;
  }
  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: { copy: (value: unknown) => void };
  }
  export class WebGLRenderer {
    constructor(options?: { antialias?: boolean; preserveDrawingBuffer?: boolean });
    setSize(width: number, height: number): void;
    domElement: HTMLCanvasElement;
    setAnimationLoop(callback: () => void): void;
    render(scene: unknown, camera: unknown): void;
  }
  export class HemisphereLight {
    constructor(sky: number, ground: number, intensity: number);
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    length(): number;
    clone(): Vector3;
    add(value: Vector3): Vector3;
    copy(value: unknown): void;
  }
  export class Box3 {
    setFromObject(object: unknown): Box3;
    getSize(target: Vector3): Vector3;
    getCenter(target: Vector3): Vector3;
  }
}

interface MeshLike {
  isMesh?: boolean;
  geometry?: {
    clone: () => {
      applyMatrix4: (matrix: unknown) => void;
      getAttribute: (name: string) => {
        getX: (index: number) => number;
        getY: (index: number) => number;
        getZ: (index: number) => number;
        count: number;
      } | undefined;
      getIndex: () => { getX: (index: number) => number; count: number } | null;
    };
  };
  matrixWorld: unknown;
}

declare module "three/examples/jsm/loaders/STLLoader.js" {
  export class STLLoader { parse(data: ArrayBuffer): unknown }
}
declare module "three/examples/jsm/loaders/OBJLoader.js" {
  export class OBJLoader { parse(text: string): unknown }
}
declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  export class GLTFLoader { parseAsync(data: ArrayBuffer, path: string): Promise<{ scene: unknown }> }
}
declare module "three/examples/jsm/loaders/FBXLoader.js" {
  export class FBXLoader { parse(data: ArrayBuffer, path: string): unknown }
}
declare module "three/examples/jsm/loaders/3MFLoader.js" {
  export class ThreeMFLoader { parse(data: ArrayBuffer): unknown }
}
declare module "three/examples/jsm/controls/OrbitControls.js" {
  export class OrbitControls {
    constructor(camera: unknown, element: HTMLElement);
    target: { copy: (value: unknown) => void };
    update(): void;
  }
}
declare module "three/examples/jsm/exporters/GLTFExporter.js" {
  export class GLTFExporter {
    parseAsync(object: unknown, options: { binary: boolean }): Promise<ArrayBuffer>;
  }
}

declare module "gifenc/dist/gifenc.esm.js" {
  export function GIFEncoder(): {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options: { palette: number[][]; delay?: number },
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): number[][];
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][]): Uint8Array;
}
