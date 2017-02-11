const PouchDB = require('pouchdb-http')

module.exports.info = function info () {
  let info = [
    {name: 'url', default: 'http://localhost:5984'},
    {name: 'database'}
  ]

  if (!process.env.COUCH_USR) {
    info.push({name: 'username'})
  }
  if (!process.env.COUCH_PWD) {
    info.push({name: 'password', silent: true})
  }

  return info
}

module.exports.open = function open (info) {
  const url = `${info.url}/${info.database}`

  return new PouchDB(url, {auth: {
    username: info.username || process.env.COUCH_USR,
    password: info.password || process.env.COUCH_PWD
  }})
}
