// Utilitários client-side para transcrever áudios longos (até ~2h) em chunks.
// - SegmentedRecorder: rotaciona o MediaRecorder em intervalos fixos para produzir
//   blobs autônomos (webm/mp4) que podem ser enviados individualmente.
// - chunkAudioFile: decodifica um arquivo de áudio inteiro e o divide em WAVs
//   menores (~4 min) usando AudioContext. Cada WAV é um arquivo válido.

export type SegmentHandler = (blob: Blob, mimeType: string, durationSec: number) => Promise<void> | void

export type SegmentedRecorderOptions = {
  segmentMs?: number // default 4 min
  onSegment: SegmentHandler
  onError?: (err: Error) => void
}

export class SegmentedRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private mimeType = 'audio/webm'
  private timer: ReturnType<typeof setTimeout> | null = null
  private stopping = false
  private startedAt = 0
  private readonly segmentMs: number
  private readonly onSegment: SegmentHandler
  private readonly onError?: (err: Error) => void

  constructor(opts: SegmentedRecorderOptions) {
    this.segmentMs = Math.max(30_000, opts.segmentMs ?? 4 * 60_000)
    this.onSegment = opts.onSegment
    this.onError = opts.onError
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
    this.beginSegment()
  }

  private beginSegment() {
    if (!this.stream) return
    const mr = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined)
    this.chunks = []
    this.startedAt = Date.now()
    mr.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data) }
    mr.onstop = async () => {
      const duration = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000))
      const mime = mr.mimeType || this.mimeType || 'audio/webm'
      const blob = new Blob(this.chunks, { type: mime })
      this.chunks = []
      try {
        if (blob.size > 2048) await this.onSegment(blob, mime, duration)
      } catch (err) {
        this.onError?.(err instanceof Error ? err : new Error(String(err)))
      }
      // Se não estamos parando, inicie o próximo segmento imediatamente
      if (!this.stopping && this.stream) this.beginSegment()
    }
    this.recorder = mr
    mr.start()
    // Agenda rotação
    this.timer = setTimeout(() => {
      if (this.recorder && this.recorder.state === 'recording') this.recorder.stop()
    }, this.segmentMs)
  }

  async stop(): Promise<void> {
    this.stopping = true
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    // encerra tracks após onstop rodar
    setTimeout(() => {
      this.stream?.getTracks().forEach((t) => t.stop())
      this.stream = null
    }, 300)
  }
}

// -------- File chunking (WAV) --------

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Falha ao ler áudio'))
    r.onload = () => {
      const s = String(r.result ?? '')
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    r.readAsDataURL(blob)
  })
}

type AudioCtx = typeof AudioContext
function getAudioCtx(): AudioContext {
  const w = window as unknown as { AudioContext?: AudioCtx; webkitAudioContext?: AudioCtx }
  const Ctx = w.AudioContext ?? w.webkitAudioContext
  if (!Ctx) throw new Error('AudioContext não suportado neste navegador.')
  return new Ctx()
}

/**
 * Divide um arquivo de áudio em chunks WAV mono 16 kHz.
 * Retorna blobs prontos para envio (cada um é um WAV válido).
 */
export async function chunkAudioFile(file: Blob, chunkSeconds = 240): Promise<Blob[]> {
  const buf = await file.arrayBuffer()
  const ctx = getAudioCtx()
  const decoded = await ctx.decodeAudioData(buf.slice(0))
  await ctx.close()

  const targetRate = 16000
  const mono = mixdownToMono(decoded)
  const resampled = await resampleToRate(mono, decoded.sampleRate, targetRate)
  const samplesPerChunk = chunkSeconds * targetRate
  const out: Blob[] = []
  for (let start = 0; start < resampled.length; start += samplesPerChunk) {
    const end = Math.min(resampled.length, start + samplesPerChunk)
    out.push(encodeWav(resampled.subarray(start, end), targetRate))
  }
  return out
}

function mixdownToMono(audio: AudioBuffer): Float32Array {
  const len = audio.length
  if (audio.numberOfChannels === 1) return audio.getChannelData(0).slice()
  const out = new Float32Array(len)
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    const data = audio.getChannelData(ch)
    for (let i = 0; i < len; i++) out[i] += data[i]
  }
  const inv = 1 / audio.numberOfChannels
  for (let i = 0; i < len; i++) out[i] *= inv
  return out
}

async function resampleToRate(input: Float32Array, inRate: number, outRate: number): Promise<Float32Array> {
  if (inRate === outRate) return input
  const OfflineCtor = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
  if (!OfflineCtor) {
    // Fallback linear se não houver OfflineAudioContext
    const ratio = inRate / outRate
    const outLen = Math.floor(input.length / ratio)
    const out = new Float32Array(outLen)
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio
      const i0 = Math.floor(src)
      const i1 = Math.min(i0 + 1, input.length - 1)
      const t = src - i0
      out[i] = input[i0] * (1 - t) + input[i1] * t
    }
    return out
  }
  const outLen = Math.ceil(input.length * (outRate / inRate))
  const offline = new OfflineCtor(1, outLen, outRate)
  const srcBuf = offline.createBuffer(1, input.length, inRate)
  srcBuf.copyToChannel(input, 0)
  const src = offline.createBufferSource()
  src.buffer = srcBuf
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2
  const dataBytes = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buffer)
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)
  let off = 44
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
