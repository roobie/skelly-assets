// A creature growl or groan: a rough glottal pulse through a voice's formants. FM read as electric; a throat is a
// pulse train that wavers, splits into subharmonics and breaks pitch, shaped by a vocal tract sized on its own.
declare name "growl";
declare duration "2.4";
import("sfx.lib");

pitch = hslider("pitch [scale:log]", 90, 40, 260, 0.1);
// The tract's formants divided by this, apart from the pitch, because formant spacing is what tells body size.
size = hslider("size [scale:log]", 1.4, 0.8, 2.6, 0.01);
// physmodels.lib's voice types: alto, bass, countertenor, soprano, tenor.
voice = hslider("voice", 1, 0, 4, 1);
vowel = hslider("vowel", 1, 0, 4, 0.01);
// Vowels the mouth moves through over the call, so it opens or closes instead of holding one shape.
glide = hslider("glide", 0, -2, 2, 0.01);
breath = hslider("breath", 0.2, 0, 0.6, 0.01);
jitter = hslider("jitter", 0.02, 0, 0.08, 0.001);
shimmer = hslider("shimmer", 0.2, 0, 0.7, 0.01);
// Every other period weakened: period doubling, the subharmonic that makes a voice sound rough and large.
sub = hslider("sub", 0.3, 0, 0.9, 0.01);
// Octaves of the sudden pitch jumps that real calls make when the folds turn chaotic.
breaks = hslider("breaks", 0.1, 0, 0.6, 0.01);
// Octaves the pitch rises with loudness, as a call strains at its peak.
lift = hslider("lift", 0.3, 0, 1, 0.01);
bend = hslider("bend", -0.3, -1, 0.5, 0.01);
rise = hslider("rise [scale:log]", 0.12, 0.02, 0.6, 0.001);
fall = hslider("fall [scale:log]", 0.8, 0.2, 1.8, 0.01);

level = riseFall(rise, fall);
progress = clamp01(seconds / (rise + fall));

// Jumps only while a slow gate is open, so breaks come now and then rather than as constant warble.
jumps = breaks * no.lfnoise0(9) * (no.lfnoise0(2.3) > 0.3);
f0 = pitch * pow(2, lift * level + bend * progress + jumps) * (1 + jitter * no.lfnoise(40));
source = os.sawtooth(f0) * (1 + shimmer * no.lfnoise(60)) * (1 - sub * (os.lf_squarewave(f0 / 2) > 0));

sized(voiceType, vowelAt, nFormants, i, freq) = fi.resonbp(fc, fc / bw, g)
with {
  index = voiceType * nFormants + vowelAt;
  fc = audible(ba.listInterp(pm.formantValues.f(i), index) / size);
  bw = ba.listInterp(pm.formantValues.bw(i), index) / size;
  g = ba.listInterp(pm.formantValues.g(i), index);
};
tract(voiceType, vowelAt, freq) = pm.formantFilterbank(voiceType, vowelAt, sized, freq);

process = pm.SFFormantModel(voice, max(0, min(4, vowel + glide * progress)), breath, f0, level, source, tract, 0);
