$(function() {

    var cartesianProductOf = function() {
        return Array.prototype.reduce.call(arguments, function(a, b) {
            var ret = [];
            a.forEach(function(a) {
                b.forEach(function(b) {
                    ret.push(a.concat([b]));
                });
            });
            return ret;
        }, [[]]);
    }

   
    var width = 800, height = 800;
    var svg = d3.select("#wrapper").append("svg")
        .attr("width", width)
        .attr("height", height);
    var g = svg.append('g');

    var projection = d3.geo.mercator()
        .scale(1500000)
        .center([-58.445055, -34.617193])
        .translate([width/2 , height/2]);

    var path = d3.geo.path().projection(projection);

    svg.append("svg:defs").selectAll("marker")
        .data([''])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    var ready = function(error, barrios, estaciones_data/*, recorridos*/) {

        d3.json("barrios.json", function(error, barrios) {
            g.append("path")
                .datum(topojson.object(barrios, barrios.objects.caca))
                .attr("d", path)
                .attr('id', 'mapa-shape');
        });

        var estaciones_coords = estaciones_data.map(function(e) {
            return [+e.cLong, +e.cLat];
        });
        var bounds = d3.geo.bounds({type: 'MultiPoint', 
                                    coordinates: estaciones_coords});

        var estaciones = g.selectAll('circle')
            .data(estaciones_data)
            .enter()
            .append('circle')
            .attr('transform', function(d) { 
                return 'translate(' + projection([+d.cLong, +d.cLat]) + ')'; 
            })
            .attr('id', function(d) { return 'estacion-' + d.EstacionID; })
            .attr('r',5)
            .append('title').text(function(d) { return d.EstacionNombre; });

        var arcs = g.append("svg:g")
            .attr('transform', 'translate(200, 0)')
            .selectAll("path")
            .data(cartesianProductOf(estaciones_data, estaciones_data))
            .enter()
            .append("svg:path")
            .attr('class', 'link')
            .attr("marker-end", function(d) { return "url(#c)"; })
            .attr('id', function(d) { 
                return 'arc-' + d[0].EstacionID + '-' + d[1].EstacionID;
            })
            .attr('d', function(d) {
                var source = d3.select('#estacion-' + d[0].EstacionID)[0][0].getBoundingClientRect(); 
                var target = d3.select('#estacion-' + d[1].EstacionID)[0][0].getBoundingClientRect();
                var dx = target.left - source.left,
                dy = target.top - source.top,
                dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + source.left + "," + source.top + "A" + dr + "," + dr + " 0 0,1 " + target.left + "," + target.top;
            });

        // table - hacemos trampa y usamos template
        _.templateSettings.variable = "estaciones";
        var table_template = _.template(d3.select('#table-template').html())
        d3.select('#wrapper').append('table').html(table_template(estaciones_data))

        d3.selectAll('table tbody td')
          .on('mouseover', function(d) { console.log(this); });


        // var b = bounds.map(projection);
        // g.transition().duration(750).attr("transform",
        //                                   "translate(" + projection.translate() + ")" +
        //                                   "scale(" + .65 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height) + ")"
        //                                   + "translate(" + -(b[1][0] + b[0][0]) / 2 + "," + -(b[1][1] + b[0][1]) / 2 + ")");

        // console.log(b);
        // console.log(estaciones);

    };


    queue()
        .defer(d3.json, "barrios.json")
        .defer(d3.csv, "estaciones.csv")
//        .defer(d3.json, "recorridos.json")
        .await(ready);

    
    
});
