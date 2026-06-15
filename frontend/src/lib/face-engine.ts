'use client';

import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.6; // euclidean distance; lower = more similar

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export interface LabeledDescriptor {
  memberId: string;
  descriptor: Float32Array;
}

/**
 * Detects a single face in the video and returns its 128-D descriptor.
 * Returns null if no face is detected.
 */
export async function detectDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

export interface MatchResult {
  memberId: string;
  distance: number;
  confidence: number; // 1 - distance, clamped to [0,1]
}

/**
 * Finds the closest stored descriptor to the query descriptor.
 * Returns null if no match is within the threshold.
 */
export function findBestMatch(
  query: Float32Array,
  candidates: LabeledDescriptor[]
): MatchResult | null {
  let best: MatchResult | null = null;

  for (const candidate of candidates) {
    const distance = faceapi.euclideanDistance(query, candidate.descriptor);
    if (distance < MATCH_THRESHOLD && (!best || distance < best.distance)) {
      best = {
        memberId: candidate.memberId,
        distance,
        confidence: Math.max(0, Math.min(1, 1 - distance)),
      };
    }
  }

  return best;
}

/**
 * Averages multiple 128-D descriptors into a single descriptor.
 * Used during enrollment to combine several captures for better accuracy.
 */
export function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  if (descriptors.length === 0) throw new Error('No descriptors to average');
  const length = descriptors[0].length;
  const avg = new Float32Array(length);
  for (const d of descriptors) {
    for (let i = 0; i < length; i++) avg[i] += d[i];
  }
  for (let i = 0; i < length; i++) avg[i] /= descriptors.length;
  return avg;
}

export function descriptorToBase64(descriptor: Float32Array): string {
  const bytes = new Uint8Array(descriptor.buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function base64ToDescriptor(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

export { MATCH_THRESHOLD };
