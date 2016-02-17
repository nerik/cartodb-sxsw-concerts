var sqlTpl = cartodb._.template('SELECT * FROM nerikcarto.sxsw_iso WHERE name = \'<%= venueName %>\' AND type=\'<%= type %>\' ORDER BY data_range DESC');

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
var venuesSublayer;
var isoSublayer;
var map;

var buildViz = function (vis, layers) {
  map = vis.getNativeMap();
  venuesSublayer = layers[1].getSubLayer(1);
  isoSublayer = layers[1].getSubLayer(0);
  venuesSublayer.setInteractivity('cartodb_id, name')
  venuesSublayer.on('featureClick', function(e, latlng, pos, data) {
    cartodb.log.log(data);
    currentVenueName = data.name;
    currentVenueLL = latlng;
    loadIso();
  });

  $('.controls input').on('click', function(e) {
    currentMode = $(e.target).val();
    map.setView(currentVenueLL, (currentMode === 'car') ? 12 : 15)
    loadIso();
  })
}

var loadIso = function () {
  var sql = sqlTpl({
    venueName: currentVenueName,
    type: currentMode
  });
  console.log(sql)

  isoSublayer.setSQL(sql);
}
