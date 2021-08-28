const useCases = ['create', 'update', 'delete', 'getById']
const { objToString } = require('../../utils')
const camelCase = require('lodash.camelcase')
const fs = require('fs')

async function generateRequest (schema) {
  // schema to plain JSON
  const obj = Object.keys(schema).reduce((obj, key) => {
    const { name, type } = schema[key]
    if (name === 'id') return obj
    obj[name] = type.name || type.constructor.name
    return obj
  }, {})

  // convert plain JSON and remove quotation marks(")
  const str = JSON.stringify(obj, null, 8)
    .replace(/"/g, '')
    .split('\n')

  // remove first and last lines
  str.shift()
  str.pop()

  return str.join('\n').trim()
}

module.exports = async ({ template: { generate }, filesystem }) => async () => {
  const entities = require(`${filesystem.cwd()}/src/domain/entities`)
  const requires = []

  for (const entity of Object.keys(entities)) {
    const { name, schema } = entities[entity].prototype.meta
    for (const action of useCases) {
      const ucPath = `src/domain/usecases/${camelCase(name)}/${useCaseName}.js`
      if(fs.lstatSync(ucPath).isFile()) continue
  
      const useCaseName = `${action}${name}`
      await generate({
        template: `domain/useCases/${action}.ejs`,
        target: ucPath,
        props: {
          name: {
            pascalCase: name,
            camelCase: camelCase(name)
          },
          request: await generateRequest(schema)
        }
      })
      let type = 'mutation'
      if (useCaseName.includes('find')) { type = 'query' }
      requires.push(`{ usecase: require('./${camelCase(name)}/${useCaseName}'), tags: { group: '${name}s', type: '${type}'} }`)
    }
  }

  await generate({
    template: 'domain/useCases/index.ejs',
    target: 'src/domain/usecases/index.js',
    props: { requires: objToString(requires) }
  })
}
