#!/usr/bin/node

const fs = require('fs')
const PouchDB = require('pouchdb-http')
const prompt = require('prompt')
const xtend = require('xtend')

/**
 * Get content from file
 */
let content

if (process.argv.length > 2) {
  const file = fs.readFileSync(process.argv[process.argv.length - 1])
  content = file.toString()
}
else {
  console.error('Error: Please specify input file')
  process.exit(1)
}

/**
 * Get cached metadata from file
 */
let meta

try {
  const cache = fs.readFileSync(getDefaultSlug() + '.json')
  meta = JSON.parse(cache) || {}
}
catch (_) {
  meta = {authors: []}
}

/**
 * Get updated metadata through prompt
 */
const fields = [
  {name: 'couch', type: 'string', default: 'http://localhost:5984', pattern: /^http/, message: 'Target must be a valid CouchDB url'},
  {name: 'site', type: 'string', default: meta.site, required: true, message: 'Please specify the site to publish to'},
  {name: 'type', type: 'string', default: meta.type, required: true, message: 'Please select a type for your entry (for example: page, post, etc.)'},
  {name: 'slug', type: 'string', default: meta.slug || getDefaultSlug()},
  {name: 'title', type: 'string', default: meta.title, required: true, message: 'Entry title is required (see: https://en.wikipedia.org/wiki/RSS#RSS_compared_to_Atom)'},
  {name: 'author', type: 'string', default: meta.authors[0], required: true, message: 'Entry author is required (see: https://en.wikipedia.org/wiki/RSS#RSS_compared_to_Atom)'},
  {name: 'subtitle', type: 'string', default: meta.subtitle},
  {name: 'summary', type: 'string', default: meta.summary},
  {name: 'username', type: 'string'},
  {name: 'password', type: 'string', hidden: true}
]

prompt.message = 'couch.pm'
prompt.delimiter = ' -> '
prompt.colors = false;
prompt.start();

/**
 * Post content and metadata to CouchDB
 */
prompt.get(fields, function(err, result) {
  if (err) {
    throw new Error(err)
  }

  // Connect CouchDB and authenticate
  const url = `${result.couch}/${result.site}`
  const couch = new PouchDB(url, {auth: {
    username: result.username,
    password: result.password
  }})

  delete result.couch
  delete result.username
  delete result.password

  // Put author in array (future-proof)
  result.authors = [result.author]
  delete result.author

  // Cache metadata to JSON file
  const json = JSON.stringify(result, null, 2)
  fs.writeFile(getDefaultSlug() + '.json', json, 'UTF-8', err => console.error)

  delete result.site

  // Prepare documet for CouchDB
  result._id = result.slug
  result.content = content
  result.updated = now()

  delete result.slug

  // Make `created` timestamp,
  // will be overwritten if
  // document exists
  const stamp = {created: result.updated}

  // Write document to CouchDB
  couch.get(result._id).
    catch(_ => result).
    then(doc => xtend(stamp, doc, result)).
    then(entry => couch.put(entry)).
    then(_ => console.info('couch.pm -> posted!')).
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
