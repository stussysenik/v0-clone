/**
 * Validation Module Index
 * Exports all validation utilities
 */

export * from './mdn-compat'
export * from './semantic-lint'
export * from './a11y-check'

// Re-export default objects
export { default as mdnCompat } from './mdn-compat'
export { default as semanticLint } from './semantic-lint'
export { default as a11yCheck } from './a11y-check'
