import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, MathUtils, Shape } from "three";
import type { ExtrudeGeometryOptions } from "three";

export interface SleeveGeometryOptions {
  radius: number;
  xStart: number;
  xEnd: number;
  scaleStartX: number;
  startU: number;
  endU: number;
  mmSpacing: number;
  canvasHeight: number;
}

export interface ThimbleBevelGeometryOptions {
  leftRadius: number;
  rightRadius: number;
  bevelLength: number;
}

/**
 * Creates the fixed sleeve geometry and maps its texture to physical millimeters.
 *
 * @param options Geometry dimensions and texture scale mapping.
 * @returns The generated sleeve geometry.
 */
export const createCustomSleeveGeometry = (options: SleeveGeometryOptions): BufferGeometry => {
  const { radius, xStart, xEnd, scaleStartX, startU, endU, mmSpacing, canvasHeight } = options;
  const radialSegmentCount = 64;
  const axialSegmentCount = 40;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const canvasHeightMm = canvasHeight / mmSpacing;

  for (let axialIndex = 0; axialIndex <= axialSegmentCount; axialIndex++) {
    const x = xStart + (axialIndex / axialSegmentCount) * (xEnd - xStart);
    const millimeters = x - scaleStartX;
    const textureU = MathUtils.clamp(startU + (millimeters / 25) * (endU - startU), 0, 1);

    for (let radialIndex = 0; radialIndex <= radialSegmentCount; radialIndex++) {
      const theta = (radialIndex / radialSegmentCount) * Math.PI * 2 - Math.PI;
      const y = radius * Math.sin(theta);
      const z = radius * Math.cos(theta);
      positions.push(x, y, z);
      normals.push(0, Math.sin(theta), Math.cos(theta));
      const arcMillimeters = radius * theta;
      const v = MathUtils.clamp(0.5 + arcMillimeters / canvasHeightMm, 0, 1);
      uvs.push(textureU, v);
    }
  }

  const rowStride = radialSegmentCount + 1;
  for (let axialIndex = 0; axialIndex < axialSegmentCount; axialIndex++) {
    for (let radialIndex = 0; radialIndex < radialSegmentCount; radialIndex++) {
      const first = axialIndex * rowStride + radialIndex;
      const second = (axialIndex + 1) * rowStride + radialIndex;
      const third = (axialIndex + 1) * rowStride + (radialIndex + 1);
      const fourth = axialIndex * rowStride + (radialIndex + 1);
      indices.push(first, second, fourth, second, third, fourth);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
};

/**
 * Creates the tapered thimble bevel geometry.
 *
 * @param options The two radii and bevel length.
 * @returns The generated thimble bevel geometry.
 */
export const createCustomThimbleBevelGeometry = (
  options: ThimbleBevelGeometryOptions,
): BufferGeometry => {
  const { leftRadius, rightRadius, bevelLength } = options;
  const radialSegmentCount = 64;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let sideIndex = 0; sideIndex <= 1; sideIndex++) {
    const x = sideIndex * bevelLength;
    const radius = sideIndex === 0 ? leftRadius : rightRadius;
    const v = sideIndex === 0 ? 1 : 0;
    for (let radialIndex = 0; radialIndex <= radialSegmentCount; radialIndex++) {
      const theta = (radialIndex / radialSegmentCount) * Math.PI * 2;
      positions.push(x, radius * Math.sin(theta), radius * Math.cos(theta));
      normals.push((leftRadius - rightRadius) / bevelLength, Math.sin(theta), Math.cos(theta));
      uvs.push(radialIndex / radialSegmentCount, v);
    }
  }

  const rowStride = radialSegmentCount + 1;
  for (let radialIndex = 0; radialIndex < radialSegmentCount; radialIndex++) {
    const first = radialIndex;
    const second = rowStride + radialIndex;
    const third = rowStride + radialIndex + 1;
    const fourth = radialIndex + 1;
    indices.push(first, second, fourth, second, third, fourth);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * Creates the forged U-frame geometry.
 *
 * @returns The generated frame geometry.
 */
export const createPrecisionFrameGeometry = (): BufferGeometry => {
  const shape = new Shape();
  shape.moveTo(-9.5, -3.8);
  shape.bezierCurveTo(-11.5, -12, -11.5, -20, -8, -25.5);
  shape.bezierCurveTo(-2, -33.5, 23, -33.5, 29, -25.5);
  shape.bezierCurveTo(31.5, -19, 31, -10, 30.5, -4.5);
  shape.lineTo(24.5, -4.5);
  shape.bezierCurveTo(24, -11, 21, -18, 16, -20.5);
  shape.bezierCurveTo(12, -21.8, 8, -21.8, 4, -20.5);
  shape.bezierCurveTo(-1, -18, -4, -11, -5.5, -3.8);
  shape.lineTo(-9.5, -3.8);
  const extrudeSettings: ExtrudeGeometryOptions = {
    depth: 1.6,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 48,
  };
  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -1.2);
  return geometry;
};

/**
 * Creates the elliptical handle geometry.
 *
 * @returns The generated handle geometry.
 */
export const createEllipticalHandleGeometry = (): BufferGeometry => {
  const shape = new Shape();
  shape.absellipse(10.25, -27, 20.75, 6.2, 0, Math.PI * 2, false, 0);
  const extrudeSettings: ExtrudeGeometryOptions = {
    depth: 2.2,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 48,
  };
  const geometry = new ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -1.5);
  return geometry;
};
