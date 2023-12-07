/**
 * @param {string} reporter
 * @returns {boolean}
 */
export function isBuiltinReporter(reporter) {
  switch (reporter) {
    case 'default':
    case 'github-actions':
    case 'summary':
      return true;
    default:
      return false;
  }
}
