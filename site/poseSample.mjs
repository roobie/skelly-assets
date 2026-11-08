// Plain pose-frame sampling shared by the browser viewer and its Node coverage.
export function samplePose(clip, time, slerp) {
  const n = clip.frames.length;
  if (n === 1) return clip.frames[0];
  const u = clip.loop ? ((time % 1 + 1) % 1) * n : Math.max(0, Math.min(1, time / clip.duration)) * (n - 1);
  const i = Math.floor(u), w = u - i, a = clip.frames[i], b = clip.frames[(i + 1) % n];
  if (!w) return a;
  return {
    root: a.root.map((x, axis) => x + (b.root[axis] - x) * w),
    rotations: Object.fromEntries([...new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)])].map((id) => [id,
      slerp(a.rotations[id] ?? [0, 0, 0, 1], b.rotations[id] ?? [0, 0, 0, 1], w),
    ])),
  };
}
