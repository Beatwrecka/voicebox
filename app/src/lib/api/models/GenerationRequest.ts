/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request model for voice generation.
 */
export type GenerationRequest = {
  profile_id: string;
  text: string;
  language?: string;
  seed?: number | null;
  model_size?: string | null;
  instruct?: string | null;
  secondary_profile_id?: string | null;
  secondary_weight?: number | null;
  pitch_shift?: number | null;
  formant_shift?: number | null;
};
