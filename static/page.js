$(document).ready(function() {
    google.maps.visualRefresh = true;
    
    var mapStyles = [
      {
        "featureType": "poi",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "landscape",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "water",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "administrative.country",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
        "featureType": "administrative.locality",
        "elementType": "labels.text",
        "stylers": [
          { "lightness": 20 }
        ]
      },{
        "featureType": "road",
        "stylers": [
          { "visibility": "off" }
        ]
      },{
      }
    ];
    
    var swiss_bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(45.64, 5.87),
        new google.maps.LatLng(47.83, 10.61)
    );
    
    var map = new google.maps.Map($('#map_canvas')[0], {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: mapStyles
    });
    map.fitBounds(swiss_bounds);
    
    var layer = new google.maps.FusionTablesLayer({
        query: {
            select: 'geometry',
            from: '812706'
        },
        clickable: false,
        map: map
    });
    
    map.controls[google.maps.ControlPosition.TOP_CENTER].push($('#map_panel')[0]);
    
    $.getJSON('static/json/geometries.json', function(data) {
        var overlays = [];
        
        $.each(data.features, function(k, geojson_feature) {
            var polygon_coordinates = null;
            
            if (geojson_feature.geometry.type === 'Polygon') {
                polygon_coordinates = geojson_feature.geometry.coordinates;
            }
            
            if (geojson_feature.geometry.type === 'MultiPolygon') {
                polygon_coordinates = [];
                $.each(geojson_feature.geometry.coordinates, function(k, group_coordinates) {
                    polygon_coordinates = polygon_coordinates.concat(group_coordinates);
                });
            }
            
            if (polygon_coordinates === null) {
                console.log('Skipping unknown geometry');
                console.log(geojson_feature);
                return;
            }
            
            var paths = [];
            $.each(polygon_coordinates, function(k, path_coordinates) {
                var path = [];
                $.each(path_coordinates, function(k, point_coordinates) {
                    var point = new google.maps.LatLng(point_coordinates[1], point_coordinates[0]);
                    path.push(point);
                });
                paths.push(path);
            });
            
            var overlay = new google.maps.Polygon({
                map: null,
                paths: paths,
                fillColor: '#' + (Math.random()*0xFFFFFF<<0).toString(16),
                strokeWeight: 1,
                strokeOpacity: 0.5,
                fillOpacity: 0.7
            });
            overlay.set('key', geojson_feature.properties.key);
            
            overlays.push(overlay);
        });
        
        $.getJSON('static/json/events.json', function(data) {
            function updateEvent(k) {
                var event = data[k];
                $('#event').text(event.title);
                
                $.each(overlays, function(k, overlay){
                    var key = overlay.get('key');
                    if (event.geometry_ids.indexOf(key) === -1) {
                        if (overlay.getMap() !== null) {
                            overlay.setMap(null);
                        }
                    } else {
                        if (overlay.getMap() === null) {
                            overlay.setMap(map);
                        }
                    }
                });
            }

            var labels = [];
            var geometry_ids = [];
            $.each(data, function(k, row){
                labels.push(row.date);

                if (typeof(row.add) !== 'undefined') {
                    $.each(row.add, function(k1, id){
                        if (geometry_ids.indexOf(id) === -1) {
                            geometry_ids.push(id);
                        }
                    });
                }

                if (typeof(row.remove) !== 'undefined') {
                    $.each(row.remove, function(k1, id) {
                        var index = geometry_ids.indexOf(id);
                        if (index !== -1) {
                            geometry_ids.splice(index, 1);
                        }
                    });
                }

                data[k].geometry_ids = geometry_ids.slice();
            });

            $('#timeline').labeledslider({
                max: data.length - 1,
                tickLabels: labels,
                value: 0,
                slide: function(event, ui) {
                    updateEvent(ui.value);
                }
            });

            updateEvent(0);
        });
    });
});