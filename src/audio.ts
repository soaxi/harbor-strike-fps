type Point = { x: number; y: number; z: number };
export class BattleAudio {
  context?: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private master?: DynamicsCompressorNode;
  private voices = new Set<AudioBufferSourceNode>();
  private pending?: Promise<void>;
  private volume?: GainNode;
  status = '音效載入中';
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createDynamicsCompressor();
      this.master.threshold.value = -18;
      this.master.ratio.value = 6;
      this.volume = this.context.createGain();
      this.volume.gain.value = 0.65;
      this.master.connect(this.volume);
      this.volume.connect(this.context.destination);
    }
    await this.context.resume();
    if (!this.pending) this.pending = this.load();
    await this.pending;
  }
  private async load() {
    let failed = 0;
    await Promise.all(
      ['rifle', 'sniper', 'shotgun', 'explosion', 'reload'].map(
        async (name) => {
          try {
            const res = await fetch(import.meta.env.BASE_URL + 'audio/' + name + '.mp3');
            if (!res.ok) throw Error('audio');
            const data = await res.arrayBuffer();
            if (this.context?.state === 'closed') return;
            this.buffers.set(name, await this.context!.decodeAudioData(data));
          } catch {
            failed++;
          }
        },
      ),
    );
    this.status = failed
      ? '部分音效無法載入，請重新整理'
      : '實錄槍聲 · 空間音效';
  }
  play(name: string, source?: Point, listener?: Point, yaw = 0, level = 1) {
    const ctx = this.context,
      buffer = this.buffers.get(name);
    if (!ctx || ctx.state !== 'running' || !buffer || !this.master) return;
    if (source && name !== 'explosion' && this.voices.size > 22) return;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = 0.97 + Math.random() * 0.06;
    const gain = ctx.createGain(),
      pan = ctx.createStereoPanner(),
      filter = ctx.createBiquadFilter();
    let distance = 0;
    if (source && listener) {
      const dx = source.x - listener.x,
        dz = source.z - listener.z;
      distance = Math.hypot(dx, dz);
      pan.pan.value = Math.max(
        -1,
        Math.min(
          1,
          (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, distance),
        ),
      );
    }
    gain.gain.value = level * (source ? 1 / (1 + distance * 0.12) : 1);
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(1800, 18000 - distance * 300);
    node.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(this.master);
    this.voices.add(node);
    node.onended = () => {
      this.voices.delete(node);
      node.disconnect();
      gain.disconnect();
      pan.disconnect();
      filter.disconnect();
    };
    node.start();
  }
  pause() {
    for (const voice of this.voices) voice.stop(); this.voices.clear(); void this.context?.suspend();
  }
  dispose() {
    for (const n of this.voices) n.stop();
    this.voices.clear();
    void this.context?.close();
  }
}


