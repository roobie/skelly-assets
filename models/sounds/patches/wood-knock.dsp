// A knock on wood: a measured wooden bar's modes, damped hard so the upper ones die within milliseconds, struck by
// a short noise contact rather than a one-sample click, which is what made earlier knocks sound like glass.
declare name "wood-knock";
declare duration "0.35";
import("sfx.lib");

// Free of the bar's musical tuning, so a knock reads as a plank or a box, not a marimba note.
pitch = hslider("pitch [scale:log]", 300, 120, 900, 1);
// The fundamental's time to -60 dB; above about 0.3 s the knock starts to ring like an instrument.
ring = hslider("ring [scale:log]", 0.12, 0.06, 0.3, 0.001);
// How much faster the upper modes die than the fundamental: wood is lossy, so steep.
slope = hslider("slope [scale:log]", 10, 3, 30, 0.1);
// Where the bar is hit, from the centre to the edge, which picks which modes sound.
place = hslider("place", 2, 0, 4, 1);
// Milliseconds of contact: a longer contact is a softer, duller knock.
touch = hslider("contact [scale:log]", 2, 1, 5, 0.01);
// The contact's own brightness, from a padded mallet to a knuckle.
hardness = hslider("hardness", 0.5, 0.1, 1, 0.01);
// The unpitched part of the contact, which modal tools keep because modes alone sound too clean.
click = hslider("click", 0.2, 0, 0.6, 0.01);

// pm.strike rises and falls over 2 ms each per unit of sharpness, so a contact of `touch` ms is touch / 4.
excitation = pm.strike(hardness, touch / 4, 1, strike);

// The bar averages its fifty modes, so it is far quieter than the contact; these gains keep both near full scale.
process = excitation <: pm.marimbaBarModel(pitch, place, ring, 1, slope) * 4, *(click * 0.1) :> _;
