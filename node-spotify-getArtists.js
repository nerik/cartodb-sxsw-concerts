#!/usr/bin/env node
/* eslint-env node, es6 */

var CartoDB = require('cartodb');
var secrets = require('./node-secret');
var request = require('request');
var _ = require('underscore');
var fs = require('fs');

var sql = new CartoDB.SQL(secrets);

var eventsRows = [];
var artists = [];

// sql.execute('SELECT DISTINCT ON(name) * FROM sxsw_events2 WHERE music is true')
//   .done(function(data) {
//     eventsRows = data.rows;
//     // console.log(_.pluck(eventsRows, 'name'))
//     fetchSpotifyData(0);
//   })
//   .error(function(e) {
//     console.log(e)
//   });



var fetchSpotifyData = function(artistIndex) {
  // console.log(eventsRows[artistIndex].name);
  var event = eventsRows[artistIndex];

  var artist = {
    name: event.name
  }
  if (event.imageURL || event.track0_spotifyURL) {
    artist = _.clone(event);
    console.error('skipping ' + artist.name)
    fetchNext(artistIndex, artist);
    return;
  }


  var artistSearchURL = `https://api.spotify.com/v1/search?q=${encodeURIComponent(event.name)}&type=artist`;

  console.error(event.name)
  console.error(artistSearchURL)

  // console.log(artistSearchURL)
  request(artistSearchURL, (error, response, artistSearchData) => {
    if (error) {
      console.error(error)
    }
    // console.log(artistSearchData)
    var artistsJSON = JSON.parse(artistSearchData).artists;
    if (artistsJSON.items.length) {
      var artistData = artistsJSON.items[0];
      artist.spotifyURL = artistData.external_urls.spotify;
      artist.imageURL = findImageURL(artistData);

      var artistId = artistData.id;
      var topTracksURL = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?country=US`;

      request(topTracksURL, (error, response, topTracksSearchData) => {
        var topTracksJSON = JSON.parse(topTracksSearchData).tracks;
        for (var i = 0; i < Math.min(3, topTracksJSON.length); i++) {
          var track = topTracksJSON[i];
          artist[`track${i}_title`] = track.name;
          artist[`track${i}_imageURL`] = findImageURL(track.album);
          artist[`track${i}_previewURL`] = track.preview_url;
          artist[`track${i}_spotifyURL`] = track.external_urls.spotify;
        }

        console.error(topTracksJSON)

        fetchNext(artistIndex, artist);
      });

    } else {
      fetchNext(artistIndex, artist);
    }

    // console.log(artistSearchData)

  });

}

var fetchNext = function(artistIndex, artist) {
  console.error(`${artistIndex+1}/${eventsRows.length}`);
  if (artistIndex < eventsRows.length-1) {
  // if (artistIndex < 10) {
    artists.push(artist);
    fetchSpotifyData(artistIndex+1);
  } else {
    console.log(JSON.stringify(artists));
  }
}

var findImageURL = function (obj) {
  // console.log(obj)
  if (!obj.images || !obj.images.length) return '';
  var img = _.findWhere(obj.images, {height: 300}) || obj.images[0];
  return img.url;
}

var json = JSON.parse(fs.readFileSync('node-spotify-getArtists2.json'));
eventsRows = json;
console.log(eventsRows.length)
console.log(eventsRows[826])
console.log(eventsRows[827])
console.log(eventsRows[828])
fetchSpotifyData(0);
