var isoSQLTpl = cartodb._.template('SELECT *, CASE WHEN sxsw_iso.type = \'car\' THEN \'driving\' ELSE \'walking\' END AS mode_lbl FROM nerikcarto.sxsw_iso WHERE name = \'<%= venueName %>\' AND type=\'<%= type %>\' ORDER BY data_range DESC');
var venueSQLTpl = cartodb._.template($('#venueSQLTpl').html());
var dayVenuesSQLTpl = cartodb._.template($('#dayVenuesSQLTpl').html());
var nearbyVenuesSQLTpl = cartodb._.template($('#nearbyVenuesSQLTpl').html());

var isoCssTpl = cartodb._.template($('#isoCssTpl').html());
var venueTpl = cartodb._.template($('#venueTpl').html());
var nearbyVenuesTpl = cartodb._.template($('#nearbyVenuesTpl').html());


var gradient = new Color.Gradient([
  {
    stop: 0,
    color: '#F13C6C'
  },

  {
    stop: 100,
    color: '#00B0D9'
  }
]);

var isos = [1800,1200,900,600,300,120];

var isoCss = isoCssTpl({
  gradient: gradient,
  isos: isos
});

var stops = {
  120: {}
}

var audio = null;


var currentVenue = {
  name: 'Javelina',
  ll: [30.2664346,-97.7397135],
  id: 99,
  isHotel: false
}
var currentMode = 'walk';
var currentDay = 17;
var venuesSublayer;
var isoSublayer;
var map;

function main() {
  cartodb.createVis('map', 'https://team.cartodb.com/u/nerikcarto/api/v2/viz/18658374-d410-11e5-8f87-0e31c9be1b51/viz.json', {
    infowindow: true
  })
  .done(buildViz)
  .error(function(err) {
    console.log(err);
  });
}
window.onload = main;


var buildViz = function (vis, layers) {
  map = vis.getNativeMap();

  isoSublayer = layers[1].getSubLayer(0);
  venuesSublayer = layers[1].getSubLayer(2);
  hotelsSublayer = layers[1].getSubLayer(1);
  // venuesSublayer.setInteractivity('cartodb_id, name')
  // hotelsSublayer.setInteractivity('cartodb_id, name')
  venuesSublayer.on('featureClick', onFeatureClick);
  hotelsSublayer.on('featureClick', onFeatureClick);
  console.log(isoCss)
  isoSublayer.setCartoCSS(isoCss);

  $('.js-controls input').on('click', function(e) {
    currentMode = $(e.target).val();
    if (currentMode == 'car') {
      map.setView(currentVenue.ll, 12);
    }
    loadIso(currentVenue.name, currentMode);
    selectVenue(currentVenue.name, currentVenue.ll, currentVenue.isHotel, currentVenue.id);
  });

  $('.js-days button').on('click', function(e) {
    var d = $(e.target).val();
    if (d !== 'allDays') d = parseInt(d);
    selectDay(d);
  });

  $('.js-venueContainer').on('click', function (e) {
    var $t = $(e.target)

    if ($t.hasClass('js-playsong')  || $t.parent('.js-playsong').length) {
      var data = $t.hasClass('js-playsong') ? $t.data() : $t.parent('.js-playsong').data();
      var eventId = $t.parents('.js-event').data('eventid');
      playSong(data, eventId);
    }
  })

  $('.js-nearbyVenuesContainer').on('click', function (e) {
    var $t = $(e.target)

    if ($t.hasClass('js-nearbyVenue') || $t.parent('.js-nearbyVenue').length) {
      var venueDOM = ($t.data('venuename')) ? $t : $t.parent('.js-nearbyVenue');
      selectVenue(venueDOM.data('venuename'), currentVenue.ll, false, venueDOM.data('venueid'));
    }
  })

  selectDay(currentDay, true)
  selectVenue(currentVenue.name, currentVenue.ll, false, currentVenue.id, true);
}

var onFeatureClick = function(e, latlng, pos, data, sublayerIndex) {
  // console.log(data)
  selectVenue(data.name, latlng, sublayerIndex === 1, data.cartodb_id);
}

var selectVenue = function(name, ll, isHotel, id, dontLoadEvents) {
  currentVenue = {
    name: name,
    isHotel: isHotel,
    id: id
  }

  if (ll) currentVenue.ll = ll;

  if (isHotel) currentVenue.name = 'hotel:' + currentVenue.name;

  $('.js-rightPane').scrollTop(0);
  $('.js-nearbyVenuesContainer').html('');
  $('.js-venueContainer').html('');

  loadIso(currentVenue.name, currentMode);

  if (!dontLoadEvents) loadVenueEvents(currentVenue.name, currentDay, isHotel, currentVenue.id);
}

var selectDay = function(day, preventSongAutoplay) {
  currentDay = day;
  $('.js-days button').removeClass('selected');
  $('.js-days button[value='+day+']').addClass('selected');
  loadVenueEvents(currentVenue.name, currentDay, currentVenue.isHotel, currentVenue.id, preventSongAutoplay);
  loadDayVenues(currentDay);
}

var loadIso = function (venueName, mode) {
  var sql = isoSQLTpl({
    venueName: venueName.replace('\'','\'\''),
    type: mode
  });
  // console.log(venueName)
  isoSublayer.setSQL(sql);
}

var loadDayVenues = function (day) {
  var sql = dayVenuesSQLTpl({
    day: day,
    allDays: day === 'allDays'
  });
  // console.log(sql)
  venuesSublayer.setSQL(sql);
}


var loadVenueEvents = function (venueName, day, isHotel, venueId, preventSongAutoplay) {
  console.log(preventSongAutoplay)
  var allDays = day === 'allDays';
  var sql = venueSQLTpl({
    venueName: venueName.replace('\'','\'\''),
    day: day,
    allDays: allDays
  });

  // console.log(sql)
  var sqlClient = new cartodb.SQL({ user: 'nerikcarto' });
  sqlClient.execute(sql)
    .done(function(data) {

      var events = _.sortBy(data.rows, function(ev) {
        if (!ev.time) return 0;
        var m = moment(ev.time.split(' - ')[0], 'h:mmA');
        if (m.hour() >= 0 && m.hour() <12) m.add(1, 'day');
        return(m.unix())
      });

      // console.log(events)
        console.log(venueName)
      var html = venueTpl({
        venue: venueName.replace('hotel:', 'Hotel: '),
        date: day,
        allDays: day === 'allDays',
        isHotel: isHotel,
        events: events
      });
      $('.js-venueContainer').html(html);

      if (!preventSongAutoplay) {
        var eventWithSong = _.chain(data.rows)
        .filter(function(ev) {
          return ev.track0_previewurl;
        })
        .shuffle()
        .first()
        .value();

        if (eventWithSong) playSong(eventWithSong, eventWithSong.cartodb_id);
      }

    })
    .error(function(errors) {
      // errors contains a list of errors
      console.log('errors:' + errors);
    });

  var nearbySQL = nearbyVenuesSQLTpl({
    center_id: venueId,
    day: day,
    allDays: allDays,
    mode: currentMode,
    isHotel: isHotel
  });
  console.log(nearbySQL)
  sqlClient.execute(nearbySQL)
    .done(function(data) {
      // console.log(data);
      var nearbyVenuesTimes = [];

      function getRangeLabel(range) {
        if (range === 120) {
          return 'Less than 2 minutes';
        } else if (!range) {
          return 'More than 30 minutes';
        }
        var prevIso = isos[isos.indexOf(range) + 1];
        return prevIso/60 + ' to ' + range/60 + ' minutes'
      }

      data.rows.forEach(function (nearbyVenue) {
        var range = nearbyVenue.data_range;
        var nearbyVenueTime = _.findWhere(nearbyVenuesTimes, {range: range});
        if (!nearbyVenueTime) {
          nearbyVenueTime = {
            range: range,
            label: getRangeLabel(range),
            color: (range) ? gradient.get((100/5)*isos.indexOf(range)).hex : gradient.get(0).hex,
            nearbyVenues: []
          }
          nearbyVenuesTimes.push(nearbyVenueTime);
        }

        var eventsSummaryOverflow = nearbyVenue.events_summary.length > 40;
        var eventsSummary = nearbyVenue.events_summary.substr(0, 40);
        if (eventsSummaryOverflow) eventsSummary += '(…)'

        nearbyVenueTime.nearbyVenues.push({
          name: nearbyVenue.name,
          id: nearbyVenue.cartodb_id,
          events: eventsSummary
        })
      })

      var nearbyVenuesHtml = nearbyVenuesTpl({
        nearbyVenuesTimes: nearbyVenuesTimes,
        modeLabel: (currentMode === 'walk') ? 'walking' : 'driving',
        isHotel: isHotel,

      })
      $('.js-nearbyVenuesContainer').html(nearbyVenuesHtml);
    });



}

var playSong = function(tracks, eventId) {
  // console.log(eventId)
  if (audio) {
      audio.pause();

      if (eventId === currentPlayingId) {
        currentPlayingId = null;
        $('.js-playsong').removeClass('selected');
        return;
      }
  }
  currentPlayingId = eventId;

  var urls = [tracks.track0_previewurl];
  if (tracks.track1_previewurl) urls.push(tracks.track1_previewurl);
  if (tracks.track2_previewurl) urls.push(tracks.track2_previewurl);
  audio = new Audio(_.shuffle(urls)[0]);
  audio.play();

  $('.js-playsong').removeClass('selected');
  $('.js-event[data-eventid='+eventId+'] .js-playsong').addClass('selected');
}
