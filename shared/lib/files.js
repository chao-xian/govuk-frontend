const { readFile } = require('fs/promises')
const { join, parse, relative, basename } = require('path')

const { glob } = require('glob')
const { paths } = require('govuk-frontend-config')
const yaml = require('js-yaml')
const { minimatch } = require('minimatch')

const { packageNameToPath } = require('./names')

/**
 * Directory listing for path
 *
 * @param {string} directoryPath - Minimatch pattern to directory
 * @param {import('glob').GlobOptionsWithFileTypesUnset} [options] - Glob options
 * @returns {Promise<string[]>} File paths
 */
const getListing = async (directoryPath, options = {}) => {
  const listing = await glob(directoryPath, {
    absolute: true,
    nodir: true,
    realpath: true,
    ...options
  })

  // Use relative paths
  return listing
    .map((entryPath) => relative(options.cwd?.toString() ?? paths.root, entryPath))
    .sort()
}

/**
 * Directory listing (directories only)
 *
 * @param {string} directoryPath - Minimatch pattern to directory
 * @returns {Promise<string[]>} Directory names
 */
const getDirectories = async (directoryPath) => {
  const listing = await getListing(`${directoryPath}/*/`, { nodir: false })

  // Use directory names only
  return listing
    .map((directoryPath) => basename(directoryPath))
    .sort()
}

/**
 * Directory listing array filter
 * Returns true for files matching every pattern
 *
 * @param {string[]} patterns - Minimatch patterns
 * @returns {(entryPath: string) => boolean} Returns true for files matching every pattern
 */
const filterPath = (patterns) => (entryPath) => {
  return patterns.every(
    (pattern) => minimatch(entryPath, pattern)
  )
}

/**
 * Directory listing array mapper
 * Runs callback for files matching every pattern
 *
 * @param {string[]} patterns - Minimatch patterns
 * @param {(file: import('path').ParsedPath) => string | string[]} callback - Runs on files matching every pattern
 * @returns {(entryPath: string) => string | string[]} Returns path (or array of paths)
 */
const mapPathTo = (patterns, callback) => (entryPath) => {
  const isMatch = filterPath(patterns)

  // Run callback on files matching every pattern (or original path)
  return isMatch(entryPath)
    ? callback(parse(entryPath))
    : entryPath
}

/**
 * Read config from YAML file
 *
 * @param {string} configPath - File path to config
 * @returns {Promise<any>} Config from YAML file
 */
const getYaml = async (configPath) => {
  return yaml.load(await readFile(configPath, 'utf8'), { json: true })
}

/**
 * Load single component data
 *
 * @param {string} componentName - Component name
 * @returns {Promise<ComponentData & { name: string }>} Component data
 */
const getComponentData = async (componentName) => {
  const yamlPath = join(packageNameToPath('govuk-frontend'), `src/govuk/components/${componentName}/${componentName}.yaml`)

  /** @type {ComponentData} */
  const yamlData = await getYaml(yamlPath)

  return {
    name: componentName,
    ...yamlData
  }
}

/**
 * Load all components' data
 *
 * @returns {Promise<(ComponentData & { name: string })[]>} Components' data
 */
const getComponentsData = async () => {
  const componentNames = await getComponentNames()
  return Promise.all(componentNames.map(getComponentData))
}

/**
 * Get component files
 *
 * @param {string} [componentName] - Component name
 * @returns {Promise<string[]>} Component files
 */
const getComponentFiles = (componentName = '') =>
  getListing(join(packageNameToPath('govuk-frontend'), `src/govuk/components/${componentName}/**/*`))

/**
 * Get component names (with optional filter)
 *
 * @param {(componentName: string, componentFiles: string[]) => boolean} [filter] - Component names array filter
 * @returns {Promise<string[]>} Component names
 */
const getComponentNames = async (filter) => {
  const componentNames = await getDirectories(join(packageNameToPath('govuk-frontend'), '**/src/govuk/components/'))

  if (filter) {
    const componentFiles = await getComponentFiles()

    // Apply component names filter
    return componentNames.filter((componentName) =>
      filter(componentName, componentFiles))
  }

  return componentNames
}

/**
 * Get examples from a component's metadata file
 *
 * @param {string} componentName - Component name
 * @returns {Promise<{ [name: string]: ComponentExample['data'] }>} returns object that includes all examples at once
 */
async function getExamples (componentName) {
  const componentData = await getComponentData(componentName)

  /** @type {{ [name: string]: ComponentExample['data'] }} */
  const examples = {}

  for (const example of componentData?.examples || []) {
    examples[example.name] = example.data
  }

  return examples
}

module.exports = {
  filterPath,
  getComponentData,
  getComponentsData,
  getComponentFiles,
  getComponentNames,
  getDirectories,
  getExamples,
  getListing,
  getYaml,
  mapPathTo
}

/**
 * Component data from YAML
 *
 * @typedef {object} ComponentData
 * @property {ComponentOption[]} [params] - Nunjucks macro options
 * @property {ComponentExample[]} [examples] - Example Nunjucks macro options
 * @property {string} [previewLayout] - Nunjucks layout for component preview
 * @property {string} [accessibilityCriteria] - Accessibility criteria
 */

/**
 * Component option from YAML
 *
 * @typedef {object} ComponentOption
 * @property {string} name - Option name
 * @property {string} type - Option type
 * @property {boolean} required - Option required
 * @property {string} description - Option description
 * @property {boolean} [isComponent] - Option is another component
 * @property {ComponentOption[]} [params] - Nested Nunjucks macro options
 */

/**
 * Component example from YAML
 *
 * @typedef {object} ComponentExample
 * @property {string} name - Example name
 * @property {object} data - Example data
 * @property {boolean} [hidden] - Example hidden from review app
 */
