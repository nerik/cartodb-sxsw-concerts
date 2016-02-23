var isoSQLTpl = cartodb._.template('SELECT * FROM nerikcarto.sxsw_iso WHERE name = \'<%= venueName %>\' AND type=\'<%= type %>\' ORDER BY data_range DESC');
var venueSQLTpl = cartodb._.template('SELECT * from nerikcarto.sxsw_events WHERE venue =  \'<%= venueName %>\' AND music is true and film is false and interactive is false AND EXTRACT(\'day\' FROM starttime) = <%= day %>');

var isoCssTpl = cartodb._.template($('#isoCssTpl').html());
var venueTpl = cartodb._.template($('#venueTpl').html());
var gradient = new Color.Gradient([
  {
    stop: 0,
    color: '#0C2C84'
  },
  {
    stop: 50,
    color: '#3DB7C6'
  },
  {
    stop: 100,
    color: '#FFFFCC'
  }
]);
var isoCss = isoCssTpl({
  gradient: gradient,
  isos: [1800,1200,900,600,300,120]
});

console.log(isoCss)

function main() {
  cartodb.createVis('map', 'https://team.cartodb.com/u/nerikcarto/api/v2/viz/18658374-d410-11e5-8f87-0e31c9be1b51/viz.json')
  .done(buildViz)
  .error(function(err) {
    console.log(err);
  });
}
window.onload = main;

var currentVenueName = 'Austin Convention Center';
var currentVenueLL = [30.4541,-97.7825];
var currentMode = 'walk';
var currentDay = 15;
var venuesSublayer;
var isoSublayer;
var map;

var buildViz = function (vis, layers) {
  map = vis.getNativeMap();
  venuesSublayer = layers[1].getSubLayer(1);
  hotelsSublayer = layers[1].getSubLayer(2);
  isoSublayer = layers[1].getSubLayer(0);
  venuesSublayer.setInteractivity('cartodb_id, name')
  hotelsSublayer.setInteractivity('cartodb_id, name')
  venuesSublayer.on('featureClick', onFeatureClick);
  hotelsSublayer.on('featureClick', onFeatureClick);

  isoSublayer.setCartoCSS(isoCss);

  $('.js-controls input').on('click', function(e) {
    currentMode = $(e.target).val();
    map.setView(currentVenueLL, (currentMode === 'car') ? 12 : 15)
    loadIso(currentVenueName, currentMode);
  });

  $('.js-days button').on('click', function(e) {
    selectDay(parseInt($(e.target).val()));
  });

  $('.js-venueContainer', '.js-nearbyVenue').on('click', function(e) {
    var venueName = $(e.target).data('venuename');
    console.log(venuename);
    selectVenue(venueName);
  });

  selectVenue(currentVenueName, currentVenueLL);
}

var onFeatureClick = function(e, latlng, pos, data, sublayerIndex) {
  selectVenue(data.name, latlng, sublayerIndex === 2);
}

var selectVenue = function(name, ll, isHotel) {
  if (ll) currentVenueLL = ll;
  currentVenueName = name;
  if (isHotel) currentVenueName = 'hotel:' + currentVenueName;
  loadIso(currentVenueName, currentMode);
  loadVenueEvents(currentVenueName, currentDay);
}

var selectDay = function(day) {
  currentDay = day;
  loadVenueEvents(currentVenueName, currentDay)
}

var loadIso = function (venueName, mode) {
  var sql = isoSQLTpl({
    venueName: venueName,
    type: mode
  });
  isoSublayer.setSQL(sql);
}

var dummyNearbyVenueTimes = [
  {
    label: 'less than 2 minutes',
    color: gradient.get(100).hex,
    nearbyVenues: [{
      name: 'Javelina',
      events: 'Chris and the Tunas, The Doury Brothers (...)'
    }]
  },
  {
    label: '2 to 5 minutes',
    color: gradient.get(20).hex,
    nearbyVenues: [{
      name: 'Javelina',
      events: 'Chris and the Tunas, The Doury Brothers (...)'
    }]
  },
  {
    label: '5 to 10 minutes',
    color: gradient.get(40).hex,
    nearbyVenues: [{
      name: 'Javelina',
      events: 'Chris and the Tunas, The Doury Brothers (...)'
    }]
  }
];

var loadVenueEvents = function (venueName, day) {
  var sql = venueSQLTpl({
    venueName: venueName,
    day: day
  });
  console.log(sql)
  var sqlClient = new cartodb.SQL({ user: 'nerikcarto' });
  sqlClient.execute(sql)
    .done(function(data) {
      console.log(data.rows);
      var events = data.rows;
      var html = venueTpl({
        venue: venueName,
        date: day,
        isHotel: false,
        modeLabel: (currentMode === 'walk') ? 'walking' : 'driving',
        events: events,
        nearbyVenuesTimes: dummyNearbyVenueTimes
      });
      $('.js-venueContainer').html(html);
    })
    .error(function(errors) {
      // errors contains a list of errors
      console.log('errors:' + errors);
    })
}
