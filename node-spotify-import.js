#!/usr/bin/env node
/* eslint-env node, es6 */

var CartoDB = require('cartodb');
var secrets = require('./node-secret');
var path = require('path');

var importer = new CartoDB.Import(secrets);
var file = path.join(__dirname, 'node-spotify-getArtists.json')

importer
  .file(file, {
    // privacy: 'public'
  })
  .done(function(table_name) {
    console.log('Table ' + table_name + ' has been created!');
  });
