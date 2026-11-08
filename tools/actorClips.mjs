import { acidTemplate } from './packages/mobgen/src/mob/acidTemplate.ts';
import { acidDeathPose, acidIdlePose, acidStrideLength } from './packages/mobgen/src/mob/acidPoses.ts';
import { clamp, smoothstep } from './packages/mobgen/src/core/math.ts';
import { mat3ToQuat } from './packages/mobgen/src/core/math.ts';
import { createGaitCache, footRestExtents, IDLE_BLEND_SPEED_MPS, legGeometryFor, stepLengthMeters, walkPose } from './packages/mobgen/src/mob/gait.ts';
import { idleBasePose, idleMotion } from './packages/mobgen/src/mob/idle.ts';
import { crawlGaitPose, crawlHitAngles, CRAWL_HIT_PEAK_FRACTION } from './packages/mobgen/src/mob/crawl.ts';
import { ARM_BONES, attackClipFor, attackOverlayFrame, attackRotations } from './packages/mobgen/src/mob/attack.ts';
import { HIT_FLINCH, flinchClipFor } from './packages/mobgen/src/mob/reactions.ts';
import { consumableTemplate } from './packages/mobgen/src/core/template.ts';
import { FLOATER_CAST, floaterCastPose, floaterDriftPose, floaterIdlePose } from './packages/mobgen/src/mob/floater.ts';
import { DRAGON_LUNGE, dragonAttackPose, dragonIdlePose, dragonStompPose, dragonStrideLength } from './packages/mobgen/src/mob/dragon.ts';
import { DOG_POUNCE, dogAttackPose, dogIdlePose, quadrupedGaitPose, quadrupedStrideLength } from './packages/mobgen/src/mob/quadruped.ts';
import { INSECT_LUNGE, insectAttackPose, insectGaitPose, insectIdlePose, insectStrideLength } from './packages/mobgen/src/mob/insect.ts';

/** Absolute local rotations, without a coordinate conversion or precision reduction. */
export const poseFrame = (pose) => ({
  root: [...pose.root],
  rotations: Object.fromEntries(Object.entries(pose.rotations).map(([id, rotation]) => [id, mat3ToQuat(rotation)])),
});

/** Loop cursors are normalized; finite cursors are seconds. One frame is a static pose. The caller names the
 * finite span's clock, so a new clip cannot get one by accident. A walk loop states the distance of one stride
 * (`strideMetres`), because travel advances it and no clock does; an idle loop keeps a time `period`. */
export function poseClip(at, { frames, loop, duration, durationSimSeconds, durationRealSeconds, period, strideMetres, samplePeriod, cycles, ...metadata }) {
  if (!Number.isInteger(frames) || frames < 1) throw new RangeError('frames must be a positive integer');
  if (typeof loop !== 'boolean') throw new TypeError('loop must be explicit');
  if (duration !== undefined) throw new TypeError('a finite span must name its clock: durationSimSeconds or durationRealSeconds');
  if (period !== undefined && strideMetres !== undefined) throw new TypeError('a loop states a period or a stride, not both');
  const span = samplePeriod ?? period ?? durationSimSeconds ?? durationRealSeconds ?? 1;
  if (!(Number.isFinite(span) && span > 0)) throw new RangeError('clip span must be positive and finite');
  if (strideMetres !== undefined && !(Number.isFinite(strideMetres) && strideMetres > 0)) throw new RangeError('strideMetres must be positive and finite');
  const clip = { kind: 'pose', loop, ...metadata };
  if (durationSimSeconds !== undefined) clip.durationSimSeconds = durationSimSeconds;
  if (durationRealSeconds !== undefined) clip.durationRealSeconds = durationRealSeconds;
  if (period !== undefined) clip.period = period;
  if (strideMetres !== undefined) clip.strideMetres = strideMetres;
  if (cycles !== undefined) clip.cycles = cycles;
  clip.frames = Array.from({ length: frames }, (_, i) => poseFrame(at(frames === 1 ? 0 : span * i / (loop ? frames : frames - 1))));
  return clip;
}

/** Acid curves are serialized before live-base joint limits or speed weighting are applied. */
export function acidClips(figure, row) {
  const tuning = acidTemplate.animation;
  if (!(Number.isInteger(row.walk_frames) && row.walk_frames >= 2 && Number.isInteger(row.attack_frames) && row.attack_frames >= 2)) throw new RangeError('acid frame counts must be at least two');
  const weighted = (values, weight) => Object.fromEntries(Object.entries(values).map(([id, angles]) => [id, angles.map((a) => a * weight)]));
  const pulse = (t, peak, duration) => t <= 0 || t >= duration ? 0 : smoothstep(t < peak ? t / peak : (duration - t) / (duration - peak));
  const action = (name, cursor, weight, metadata = {}) => ({
    kind: 'jointDelta', cursor, speedWeight: false, sideScalesZ: name === 'hit', footSoleHold: false, ...metadata,
    frames: Array.from({ length: row.attack_frames }, (_, i) => ({ angles: weighted(tuning[name], weight(i / (row.attack_frames - 1))) })),
  });
  // Canonical baked fall: absolute, endpoint-inclusive, from idle frame zero; the last frame is the settled fold.
  const rest = acidIdlePose(figure.realized, 0);
  const death = (direction) => poseClip((time) => acidDeathPose(figure.realized, rest, time, direction), { loop: false, durationRealSeconds: tuning.deathDuration, frames: row.attack_frames });
  return { standing: {
    idle: poseClip((time) => acidIdlePose(figure.realized, time), { loop: true, period: tuning.idlePeriod, frames: row.walk_frames }),
    death: { forward: death(1), backward: death(-1) },
    walk: {
      kind: 'jointDelta', loop: true, cursor: 'gaitPhase', speedWeight: true, sideScalesZ: false, footSoleHold: true, cycles: 1,
      strideMetres: acidStrideLength(figure.realized),
      frames: Array.from({ length: row.walk_frames }, (_, i) => {
        const angles = {};
        for (const [index, side] of ['L', 'R'].entries()) {
          const wave = Math.sin(2 * Math.PI * i / row.walk_frames + index * Math.PI);
          const lift = Math.max(0, wave);
          angles[`thigh.${side}`] = [tuning.swing * lift, 0, 0];
          angles[`shin.${side}`] = [tuning.kneeLift * lift, 0, 0];
          angles[`arm.${side}`] = [-tuning.armSwing * wave, 0, 0];
        }
        return { angles };
      }),
    },
    attack: action('attack', 'time', (u) => pulse(u * tuning.attackDuration, tuning.attackPeak, tuning.attackDuration), { durationSimSeconds: tuning.attackDuration, hitAtSimSeconds: tuning.attackPeak }),
    spitDraw: action('spitDraw', 'progress', (u) => smoothstep(clamp(u, 0, 1))),
    hit: action('hit', 'time', (u) => pulse(u * tuning.hitDuration, tuning.hitPeak, tuning.hitDuration), { durationSimSeconds: tuning.hitDuration, peakAtSimSeconds: tuning.hitPeak }),
  } };
}

export function fusedClips(figure) {
  return { standing: { idle: poseClip(() => ({ root: figure.originOffset.map((v) => v / figure.scale), rotations: {} }), { loop: false, frames: 1 }) } };
}

/** Non-humanoid plans retain mobgen's absolute poses; no facing conversion is applied. */
export function creatureClips(figure, template, row) {
  const { realized, genome } = figure;
  const frames = { walk: row.walk_frames, attack: row.attack_frames };
  if (!(Number.isInteger(frames.walk) && frames.walk >= 2 && Number.isInteger(frames.attack) && frames.attack >= 2)) {
    throw new RangeError('creature frame counts must be at least two');
  }
  let idle;
  let walk;
  let attack;
  let action;
  let cycleMetres;
  if (template.bodyPlan === 'quadruped') {
    const stance = { limp: genome.params.limp, headTilt: genome.params.headTilt, jawOpen: genome.params.jawOpen };
    idle = () => dogIdlePose(realized, stance);
    cycleMetres = quadrupedStrideLength(realized, stance);
    walk = (cursor) => quadrupedGaitPose(realized, cursor * cycleMetres, row.walk_speed, stance);
    action = DOG_POUNCE;
    attack = (time) => dogAttackPose(realized, idle(), time);
  } else if (template.bodyPlan === 'insect') {
    const stance = { mandibleOpen: genome.params.mandibleOpen };
    idle = () => insectIdlePose(realized, 0.9);
    cycleMetres = insectStrideLength(realized);
    walk = (cursor) => insectGaitPose(realized, cursor * cycleMetres, row.walk_speed, stance);
    action = INSECT_LUNGE;
    attack = (time) => insectAttackPose(realized, insectIdlePose(realized, 0), time);
  } else if (template.bodyPlan === 'floater') {
    const params = genome.params;
    idle = () => floaterIdlePose(realized, params);
    cycleMetres = params.driftCycle;
    walk = (cursor) => floaterDriftPose(realized, params, cursor);
    action = FLOATER_CAST;
    attack = (time) => floaterCastPose(realized, params, time);
  } else if (template.bodyPlan === 'dragon') {
    const params = genome.params;
    idle = () => dragonIdlePose(realized, params);
    cycleMetres = dragonStrideLength(realized, params);
    walk = (cursor) => dragonStompPose(realized, params, cursor);
    action = DRAGON_LUNGE;
    attack = (time) => dragonAttackPose(realized, params, time);
  } else throw new Error(`unsupported creature body plan ${template.bodyPlan}`);
  return { standing: {
    idle: poseClip(idle, { loop: true, period: 1, frames: 1 }),
    walk: poseClip(walk, { loop: true, strideMetres: cycleMetres, samplePeriod: 1, frames: frames.walk, cycles: 1 }),
    attack: poseClip(attack, { loop: false, durationSimSeconds: action.duration, frames: frames.attack, hitAtSimSeconds: action.hitTime }),
  } };
}

/** Both locomotion sets use the same figure, including injured crawling on a standing rig. */
export function humanoidPoseClips(figure, row) {
  if (!(Number.isInteger(row.walkCycles) && row.walkCycles > 0)) throw new RangeError('walkCycles must be a positive integer');
  const actor = {
    bones: figure.realized.body.bones,
    extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels),
    params: figure.genome.params, seed: figure.seed,
    cache: createGaitCache(), planPeriodSteps: 2 * row.walkCycles,
  };
  // The crawl cycle is 2π of gait phase. The crawl has no stride length of its own, so the bake reads one radian
  // of phase as one metre, as its earlier time span did at one metre per second.
  const crawlStrideMetres = 2 * Math.PI;
  const crawling = {
    idle: poseClip(() => crawlGaitPose(figure.realized, 0, 0), { frames: 1, loop: false }),
    walk: poseClip((cursor) => crawlGaitPose(figure.realized, cursor * 2 * Math.PI, row.walk_speed), { frames: row.walk_frames, loop: true, strideMetres: crawlStrideMetres, samplePeriod: 1, cycles: 1 }),
  };
  if (row.legCut !== undefined) return { crawling };
  const gaitBasis = { params: actor.params, geomL: legGeometryFor(actor.bones, actor.extents, 'L'), speed: row.walk_speed, seed: actor.seed, cache: actor.cache, planPeriodSteps: actor.planPeriodSteps };
  const standingStrideMetres = Array.from({ length: actor.planPeriodSteps }, (_, step) => stepLengthMeters(gaitBasis, step)).reduce((sum, length) => sum + length, 0) / row.walkCycles;
  const standing = {
    idle: Object.fromEntries(['slack', 'aggravated'].map((stance) => [stance, {
      base: poseFrame(idleBasePose(actor, stance)), motion: idleMotion(stance),
    }])),
    walk: poseClip((cursor) => {
      const steps = cursor * 2 * row.walkCycles;
      return walkPose(actor, { stepIndex: Math.floor(steps), progress: steps % 1 }, row.walk_speed);
    }, { frames: row.walk_frames * row.walkCycles, loop: true, strideMetres: standingStrideMetres, samplePeriod: 1, cycles: row.walkCycles, idleBlendSpeed: IDLE_BLEND_SPEED_MPS }),
  };
  return { standing, crawling };
}

/** Endpoint-inclusive action frames are independent of their eventual live base. */
export function humanoidClips(figure, template, row) {
  const sets = humanoidPoseClips(figure, { ...row, legCut: template.legCut });
  const actor = {
    bones: figure.realized.body.bones,
    extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels),
    params: figure.genome.params, seed: figure.seed,
  };
  if (!(Number.isInteger(row.attack_frames) && row.attack_frames >= 2)) throw new RangeError('attack_frames must be at least two');
  const overlay = (clip, flinch, crawling) => ({
    kind: 'overlay', durationSimSeconds: clip.duration,
    ...(flinch ? { peakAtSimSeconds: clip.keys[1].t } : { hitAtSimSeconds: clip.hitTime }),
    sideScalesZ: flinch, walkBlendBones: [...ARM_BONES],
    frames: Array.from({ length: row.attack_frames }, (_, i) => {
      const time = clip.duration * i / (row.attack_frames - 1);
      if (!crawling) return attackOverlayFrame(actor, clip, time);
      // A crawling rig may have no lower legs; its live action never computes a standing pelvis drop.
      const frame = attackRotations(actor, clip, time, { root: [0, 0, 0], rotations: {}, angles: {} });
      return { angles: frame.clipAngles, walkBlendWeight: frame.armWalkWeight, dropMetres: 0 };
    }),
  });
  if (sets.standing) {
    sets.standing.attack = overlay(attackClipFor(template), false, false);
    sets.standing.flinch = overlay(flinchClipFor(template), true, false);
  }
  sets.crawling.attack = overlay(attackClipFor(consumableTemplate('legless-humanoid')), false, true);
  sets.crawling.flinch = {
    kind: 'overlay', durationSimSeconds: HIT_FLINCH.duration, peakAtSimSeconds: HIT_FLINCH.duration * CRAWL_HIT_PEAK_FRACTION,
    sideScalesZ: true, walkBlendBones: [],
    frames: Array.from({ length: row.attack_frames }, (_, i) => ({
      angles: crawlHitAngles(HIT_FLINCH.duration * i / (row.attack_frames - 1)), walkBlendWeight: 1, dropMetres: 0,
    })),
  };
  return sets;
}
