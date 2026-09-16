/**
 * Minimal PCM WAV utilities (mono, 16-bit) so the pipeline needs no ffmpeg for audio prep.
 */
export type PcmAudio = { samples: Float32Array; sampleRate: number };

export function encodeWav({ samples, sampleRate }: PcmAudio): Buffer {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    buf.writeInt16LE(Math.round(s < 0 ? s * 32768 : s * 32767), 44 + i * 2);
  }
  return buf;
}

export function decodeWav(buf: Buffer): PcmAudio {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let bits = 16;
  let format = 1;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      const frames = Math.floor(size / (channels * (bits / 8)));
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) {
          const idx = body + (i * channels + c) * (bits / 8);
          if (format === 3 && bits === 32) acc += buf.readFloatLE(idx);
          else if (bits === 16) acc += buf.readInt16LE(idx) / 32768;
          else if (bits === 8) acc += (buf.readUInt8(idx) - 128) / 128;
          else if (bits === 24) acc += ((buf.readUInt8(idx) | (buf.readUInt8(idx + 1) << 8) | (buf.readInt8(idx + 2) << 16)) << 8) / 2147483648;
          else if (bits === 32) acc += buf.readInt32LE(idx) / 2147483648;
        }
        out[i] = acc / channels;
      }
      return { samples: out, sampleRate };
    }
    offset = body + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/** Linear-interpolation resampler (good enough for speech → 16 kHz whisper input). */
export function resample(audio: PcmAudio, targetRate: number): PcmAudio {
  if (audio.sampleRate === targetRate) return audio;
  const ratio = audio.sampleRate / targetRate;
  const n = Math.floor(audio.samples.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(audio.samples.length - 1, i0 + 1);
    const t = pos - i0;
    out[i] = audio.samples[i0]! * (1 - t) + audio.samples[i1]! * t;
  }
  return { samples: out, sampleRate: targetRate };
}

export function rms(samples: Float32Array): number {
  if (!samples.length) return 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) acc += samples[i]! * samples[i]!;
  return Math.sqrt(acc / samples.length);
}

export function peak(samples: Float32Array): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) p = Math.max(p, Math.abs(samples[i]!));
  return p;
}

/**
 * Normalise loudness to a target RMS (dBFS) with a soft-knee peak limiter so nothing clips.
 * Speech from Kokoro is fairly consistent; this evens out sections and keeps YouTube from
 * turning the whole video down.
 */
export function normalizeLoudness(samples: Float32Array, targetDbfs = -19, ceiling = 0.95): Float32Array {
  const current = rms(samples);
  if (current < 1e-6) return samples;
  const target = Math.pow(10, targetDbfs / 20);
  let gain = target / current;
  const pk = peak(samples) * gain;
  if (pk > ceiling) gain *= ceiling / pk; // never clip; loudness stays as close as possible
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i]! * gain;
  return out;
}

export function silence(ms: number, sampleRate: number): Float32Array {
  return new Float32Array(Math.round((ms / 1000) * sampleRate));
}

export function concat(parts: Float32Array[]): Float32Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Trim leading/trailing near-silence but keep a small margin. */
export function trimSilence(samples: Float32Array, sampleRate: number, threshold = 0.01, keepMs = 60): Float32Array {
  let start = 0;
  let end = samples.length;
  while (start < end && Math.abs(samples[start]!) < threshold) start++;
  while (end > start && Math.abs(samples[end - 1]!) < threshold) end--;
  const keep = Math.round((keepMs / 1000) * sampleRate);
  start = Math.max(0, start - keep);
  end = Math.min(samples.length, end + keep);
  return samples.slice(start, end);
}

export function durationMs(audio: PcmAudio): number {
  return Math.round((audio.samples.length / audio.sampleRate) * 1000);
}

/** Short fade in/out to avoid clicks at boundaries. */
export function fadeEdges(samples: Float32Array, sampleRate: number, ms = 12): Float32Array {
  const n = Math.min(samples.length >> 1, Math.round((ms / 1000) * sampleRate));
  const out = samples.slice();
  for (let i = 0; i < n; i++) {
    const g = i / n;
    out[i]! *= g;
    out[out.length - 1 - i]! *= g;
  }
  return out;
}
