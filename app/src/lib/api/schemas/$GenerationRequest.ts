/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GenerationRequest = {
  description: `Request model for voice generation.`,
  properties: {
    profile_id: {
      type: 'string',
      isRequired: true,
    },
    text: {
      type: 'string',
      isRequired: true,
      maxLength: 5000,
      minLength: 1,
    },
    language: {
      type: 'string',
      pattern: '^(en|zh)$',
    },
    seed: {
      type: 'any-of',
      contains: [
        {
          type: 'number',
        },
        {
          type: 'null',
        },
      ],
    },
    model_size: {
      type: 'any-of',
      contains: [
        {
          type: 'string',
          pattern: '^(1\\.7B|0\\.6B)$',
        },
        {
          type: 'null',
        },
      ],
    },
    instruct: {
      type: 'any-of',
      contains: [
        {
          type: 'string',
          maxLength: 500,
        },
        {
          type: 'null',
        },
      ],
    },
    secondary_profile_id: {
      type: 'any-of',
      contains: [
        {
          type: 'string',
        },
        {
          type: 'null',
        },
      ],
    },
    secondary_weight: {
      type: 'any-of',
      contains: [
        {
          type: 'number',
          maximum: 1,
          minimum: 0,
        },
        {
          type: 'null',
        },
      ],
    },
    pitch_shift: {
      type: 'any-of',
      contains: [
        {
          type: 'number',
          maximum: 12,
          minimum: -12,
        },
        {
          type: 'null',
        },
      ],
    },
    formant_shift: {
      type: 'any-of',
      contains: [
        {
          type: 'number',
          maximum: 1.4,
          minimum: 0.7,
        },
        {
          type: 'null',
        },
      ],
    },
  },
} as const;
