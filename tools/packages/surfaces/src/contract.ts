// Imports nothing, so the manifest can record the contract where the tools' dependencies are not installed.

/**
 * The version of what a consumer relies on: the kinds, their look fields, uniforms, game inputs and the extras shape.
 * It rises by one with every breaking change, so a consumer that reads only release files can refuse a contract it
 * does not know.
 */
export const SURFACE_CONTRACT = 1;
