#!/usr/bin/node

const fs = require('fs')
const marked = require('marked')
const PouchDB = require('pouchdb-http')
const prompt = require('prompt')
const xtend = require('xtend')

/**
 * Get content from file
 */
let content

if (process.argv.length > 2) {
  const file = fs.readFileSync(process.argv[process.argv.length - 1])
  content = marked(file.toString())
}
else {
  console.error('Error: Please specify input file')
  process.exit(1)
}


/**
 * Get metadata through prompt
 */
const fields = [
  {name: 'couch', type: 'string', default: 'http://localhost:5984', pattern: /^http/, message: 'Target must be a valid CouchDB url'},
  {name: 'site', type: 'string', required: true, message: 'Please specify the site to publish to'},
  {name: 'username', type: 'string'},
  {name: 'password', type: 'string', hidden: true},
  {name: 'type', type: 'string', required: true, message: 'Please select a type for your entry (for example: page, post, etc.)'},
  {name: 'slug', type: 'string', default: getDefaultSlug()},
  {name: 'title', type: 'string', required: true, message: 'Entry title is required (see: https://en.wikipedia.org/wiki/RSS#RSS_compared_to_Atom)'},
  {name: 'author', type: 'string', required: true, message: 'Entry author is required (see: https://en.wikipedia.org/wiki/RSS#RSS_compared_to_Atom)'},
  {name: 'subtitle', type: 'string'},
  {name: 'summary', type: 'string'}
]

prompt.message = 'couch.pm'
prompt.delimiter = ' -> '
prompt.start();

/**
 * Post content and metadata to CouchDB
 */
prompt.get(fields, function(err, result) {
  if (err) {
    throw new Error(err)
  }

  const url = `${result.couch}/${result.site}`
  const couch = new PouchDB(url, {auth: {
    username: result.username,
    password: result.password
  }})

  result._id = result.slug
  result.content = content
  result.updated = now()

  delete result.couch
  delete result.site
  delete result.username
  delete result.password
  delete result.slug

  couch.put(result).
    then(_ => console.info('Published!')).
    catch(_ => couch.get(result._id)).
    then(doc => xtend(doc, result)).
    then(entry => couch.put(entry)).
    then(_ => console.info('Updated!')).
    catch(console.error)
})

/**
 * Helper function to set time
 */
function now() {
  return new Date().getTime()
}

/**
 * Helper function to get default slug
 * by removing common extensions
 * from input file name
 */
function getDefaultSlug() {
  return process.argv[process.argv.length - 1].
    replace(/\.md$/, '').
    replace(/\.markdown$/, '').
    replace(/\.txt$/, '')
}
