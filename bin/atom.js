#!/usr/bin/node

const ask = require('../lib/ask')
const database = require('../lib/database')
const input = require('get-stdin')
const minimist = require('minimist')
const xtend = require('xtend')

const argv = minimist(process.argv.slice(2))
const couch = database.info()

/**
 * Get content from stdin
 */
input().then(function (content) {
  return {content: content}
}).

/**
 * Connect and authenticate to CouchDB
 */
then(function (content) {
  return ask(couch).then(function (couch) {
    return xtend(content, {db: database.open(couch)})
  })
}).

/**
 * Get existing or empty document from CouchDB
 */
then(function (couch) {
  console.log(couch)
  return ask({
    name: 'entry',
    default: argv.entry || argv.e
  }).then(function (res) {
    return couch.db.get(res.entry).catch(function (err) {
      if (err.status === 404) return {
        _id: res.entry,
        authors: []
      }
      throw new Error(err.message)
    })
  }).then(function (doc) {
    return xtend(couch, {doc: doc})
  })
}).

/**
 * Update document with input content
 */
then(function (couch) {
  const time = new Date()
  const doc = xtend(couch.doc, {
    content: couch.content,
    created: couch.doc.created ? new Date(couch.doc.created) : time,
    updated: time
  })

  return {db: couch.db, doc: doc}
}).

/**
 * Create or update document metadata
 */
then(function (couch) {
  const entry = [
    {name: 'title', default: couch.doc.title},
    {name: 'type', default: couch.doc.type},
    {name: 'author', default: couch.doc.authors[0]},
    {name: 'subtitle', default: couch.doc.subtitle},
    {name: 'summary', default: couch.doc.summary},
  ]

  return ask(entry).then(function (res) {
    // Put author in array (future-proof)
    res.authors = [res.author]
    delete res.author

    return {db: couch.db, doc: xtend(couch.doc, res)}
  })
}).

/**
 * Put updated document in CouchDB
 */
then(function (couch) {
  return couch.db.put(couch.doc)
}).

/**
 * Wrap up or throw unhandled errors
 */
then(function (res) {
  console.info(`${res.id} -> posted!`)
  process.exit(0)
}).

catch(function (err) {
  console.warn('stopped.')

  if (argv.v) {
    console.error(err)
  }
  process.exit(1)
})
