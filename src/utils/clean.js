/* eslint-disable no-param-reassign */
// Clean up a string to be used as a path
export default str =>  str? str.trim().replace(/\s\s+/g, ' '): '';
