var isoSQLTpl = cartodb._.template('SELECT * FROM nerikcarto.sxsw_iso WHERE name = \'<%= venueName %>\' AND type=\'<%= type %>\' ORDER BY data_range DESC');
var venueSQLTpl = cartodb._.template($('#venueSQLTpl').html());
var dayVenuesSQLTpl = cartodb._.template($('#dayVenuesSQLTpl').html());

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
var isoCss = isoCssTpl({
  gradient: gradient,
  isos: [1800,1200,900,600,300,120]
});

var audio = null;

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

var currentVenueName = 'BD Riley\'s';
var currentVenueLL = [30.4541,-97.7825];
var currentMode = 'walk';
var currentDay = 16;
var venuesSublayer;
var isoSublayer;
var map;

var buildViz = function (vis, layers) {
  map = vis.getNativeMap();

  isoSublayer = layers[1].getSubLayer(0);
  venuesSublayer = layers[1].getSubLayer(2);
  hotelsSublayer = layers[1].getSubLayer(1);
  // venuesSublayer.setInteractivity('cartodb_id, name')
  // hotelsSublayer.setInteractivity('cartodb_id, name')
  venuesSublayer.on('featureClick', onFeatureClick);
  hotelsSublayer.on('featureClick', onFeatureClick);



  isoSublayer.setCartoCSS(isoCss);

  $('.js-controls input').on('click', function(e) {
    currentMode = $(e.target).val();
    map.setView(currentVenueLL, (currentMode === 'car') ? 12 : 15);
    loadIso(currentVenueName, currentMode);
  });

  $('.js-days button').on('click', function(e) {
    selectDay(parseInt($(e.target).val()));
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
      var nearbyVenueName = $t.data('venuename') || $t.parent('.js-nearbyVenue').data('venuename');
      selectVenue(nearbyVenueName);
    }
  })

  selectDay(currentDay)
  selectVenue(currentVenueName, currentVenueLL);
}

var onFeatureClick = function(e, latlng, pos, data, sublayerIndex) {
  selectVenue(data.name, latlng, sublayerIndex === 1);
}

var selectVenue = function(name, ll, isHotel) {
  if (ll) currentVenueLL = ll;
  currentVenueName = name;
  if (isHotel) currentVenueName = 'hotel:' + currentVenueName;
  loadIso(currentVenueName, currentMode);
  loadVenueEvents(currentVenueName, currentDay, isHotel);
}

var selectDay = function(day) {
  currentDay = day;
  $('.js-days button').removeClass('selected');
  $('.js-days button[value='+day+']').addClass('selected');
  loadVenueEvents(currentVenueName, currentDay);
  loadDayVenues(currentDay);
}

var loadIso = function (venueName, mode) {
  var sql = isoSQLTpl({
    venueName: venueName.replace('\'','\'\''),
    type: mode
  });
  isoSublayer.setSQL(sql);
}

var loadDayVenues = function (day) {
  var sql = dayVenuesSQLTpl({
    day: day,
    allDays: day === 'allDays'
  });
  console.log(sql)
  venuesSublayer.setSQL(sql)
}

var dummyNearbyVenueTimes = [
  {
    label: 'Less than 2 minutes',
    color: gradient.get(100).hex,
    nearbyVenues: [{
      name: 'Javelina',
      events: 'Chris and the Tunas, The Doury Brothers (...)'
    }]
  },
  {
    label: '2 to 5 minutes',
    color: gradient.get(70).hex,
    nearbyVenues: [{
      name: 'Tap Room at The Market',
      events: 'Caroll'
    },{
      name: 'Scratch House Backyard ',
      events: 'The Crookes'
    }]
  },
  {
    label: '5 to 10 minutes',
    color: gradient.get(40).hex,
    nearbyVenues: [{
      name: 'Bungalow',
      events: 'Arkells, Gateway Drugs (...)'
    }]
  }
];

var loadVenueEvents = function (venueName, day, isHotel) {
  var sql = venueSQLTpl({
    venueName: venueName.replace('\'','\'\''),
    day: day,
    allDays: day === 'allDays'
  });

  console.log(sql)
  var sqlClient = new cartodb.SQL({ user: 'nerikcarto' });
  sqlClient.execute(sql)
    .done(function(data) {
      var events = _.sortBy(data.rows, function(ev) {
        if (!ev.time) return 0;
        var m = moment(ev.time.split(' - ')[0], 'h:mmA');
        if (m.hour() >= 0 && m.hour() <12) m.add(1, 'day');
        return(m.unix())
      });
      var html = venueTpl({
        venue: venueName,
        venue: venueName,
        date: day,
        allDays: day === 'allDays',
        isHotel: isHotel,
        events: events
      });
      $('.js-venueContainer').html(html);

      var eventWithSong = _.chain(data.rows)
        .filter(function(ev) {
          return ev.track0_previewurl;
        })
        .shuffle()
        .first()
        .value();

      // if (eventWithSong) playSong(eventWithSong, eventWithSong.cartodb_id);

    })
    .error(function(errors) {
      // errors contains a list of errors
      console.log('errors:' + errors);
    });

  var nearbyVenuesHtml = nearbyVenuesTpl({
    nearbyVenuesTimes: dummyNearbyVenueTimes,
    modeLabel: (currentMode === 'walk') ? 'walking' : 'driving',
    isHotel: isHotel,

  })
  $('.js-nearbyVenuesContainer').html(nearbyVenuesHtml);

}

var playSong = function(tracks, eventId) {
  console.log(eventId)
  if (audio) {
      audio.pause();
  }
  var urls = [tracks.track0_previewurl];
  if (tracks.track1_previewurl) urls.push(tracks.track1_previewurl);
  if (tracks.track2_previewurl) urls.push(tracks.track2_previewurl);
  audio = new Audio(_.shuffle(urls)[0]);
  audio.play();

  $('.js-playsong').removeClass('selected');
  $('.js-event[data-eventid='+eventId+'] .js-playsong').addClass('selected');
}
