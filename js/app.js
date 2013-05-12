$(function() {

    var monthNames = [ 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
                       'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre' ];
    var getMonthName = function(m) { return monthNames[m]; };
    var weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var getWeekdayName = function(d) { return weekDays[d]; };

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

    var RecorridosData = function(data) {
        this.data = data;
        this.position = 0;
    };
    

    // Para acceder facil a la data de recorridos
    RecorridosData.prototype.next = function() {
        if (this.position == this.data.length) return null;
        while (this.data[this.position].length < 3) {
            if (this.position == this.data.length) return null;
            this.position++;
        }
        return this.parse(this.data[this.position++]);
    };

    RecorridosData.prototype.prev = function() {
        if (this.position == 0) return null;
        return this.parse(this.data[--this.position]);
        
    };

    RecorridosData.prototype.parse = function(e) {
        return {
            d: new Date(e[0] * 1000),
            r: e.slice(1)
        };
    }

    // para los colores de la tabla y los links del mapa
    var quantize = d3.scale.quantize()
        .domain([0, 1, 10])
        .range(d3.range(5).map(function(i) { return "q" + i + "-5"; }));

    var paintTable = function(table, recorridos) {
        var total_viajes = 0;

        table.selectAll('td')
          .attr('class', function(d) {
              var es = this.id.slice(3).split('-').map(function(i) { return parseInt(i); });

              var num_viajes = recorridos.r.filter(function(r) { // viajes
                    return (r[0] == es[0] && r[1] == es[1]);
                  }).reduce(function(prev, cur) {
                      return prev + cur[2];
                  }, 0);

              total_viajes += num_viajes; // acumulo la cantidad de bicis moviendose en este periodo
              this.num_viajes = num_viajes; // backup para poder setear el texto
              var t = num_viajes == 0 ? '' : quantize(num_viajes);
              return t;
          })
          .text(function(d) { return this.num_viajes == 0 ? '' : this.num_viajes; });
        
        return total_viajes;
    };

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

    var defs = svg.append("svg:defs");


    var ready = function(error, barrios, estaciones_data, recorridos) {

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

        var markers = defs.selectAll('marker')
            .data(cartesianProductOf(estaciones_data, estaciones_data))
            .enter()
            .append('marker')
            .attr("id", function(d) { return 'marker-' + d[0].EstacionID + '-' + d[1].EstacionID; })
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -1.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");


        var arcs = g.append("svg:g")
            .attr('transform', 'translate(200, 0)')
            .selectAll("path")
            .data(cartesianProductOf(estaciones_data, estaciones_data))
            .enter()
            .append("svg:path")
            .attr('class', 'link')
            .attr('id', function(d) { 
                return 'arc-' + d[0].EstacionID + '-' + d[1].EstacionID;
            })
            // .attr("marker-end", function(d) { 
            //     return "url(#marker" + this.id.slice(3)+ ")"; 
            // })
            .attr('d', function(d) {
                var source = d3.select('#estacion-' + d[0].EstacionID)[0][0].getBoundingClientRect(); 
                var target = d3.select('#estacion-' + d[1].EstacionID)[0][0].getBoundingClientRect();
                var dx = target.left - source.left,
                dy = target.top - source.top,
                dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + source.left + "," + source.top + "A" + dr + "," + dr + " 0 0,1 " + target.left + "," + target.top;
//                return 'M' + source.left + ',' + source.top + 'L' + target.left + "," + target.top;


            });

        // table - hacemos trampa y usamos template
        _.templateSettings.variable = "estaciones";
        var table_template = _.template(d3.select('#table-template').html())
        d3.select('#wrapper').append('table').html(table_template(estaciones_data))

        var showLink = function(id, klass) {
            var arc = d3.select('#arc-' + id)
                .classed(klass == '' ? 'grey' : klass, true)
                .transition()
                .duration(500)
                .style('stroke-opacity', 1)
                .style('fill', 'none');

            d3.select('#marker-' + id)
                .style('opacity', 1)
                .attr('class', klass);
        };

        var hideLink = function(id, klass) {
            d3.selectAll('#arc-' + id)
                .classed(klass == '' ? 'grey' : klass, false)
                .transition()
                .duration(200)
                .style('stroke-opacity', 0);

            d3.select('#marker-' + id)
                .style('opacity', 0)
                .attr('class', null);
        };

        d3.selectAll('table tbody td')
          .on('mouseover', function(d) { 
              showLink(this.id.slice(3), this.className);
          })
          .on('mouseout', function(d) {
              hideLink(this.id.slice(3), this.className);
          });

        var recorridos_d = new RecorridosData(recorridos);

        var interval;
        d3.select('button#play')
          .on('click', function() {
              if (this.innerHTML == '❙❙') {
                  this.innerHTML = '▸';
                  d3.selectAll('button#next, button#prev').attr('disabled', null);
                  clearInterval(interval);
              }
              else {
                  this.innerHTML = '❙❙';
                  d3.selectAll('button#next, button#prev').attr('disabled', true);
                  interval = setInterval(function() { showInterval(recorridos_d.next()) }, 0.5 * 1000);
              }
          });

        var r = recorridos_d.next();
        var r_prev = r.d;

        var total_bicis = [] // array de [time, total_bicis_en_uso], para el linechart


        // linechart para el acumulado de bicis en uso
        var linechart = d3.select('#linechart').append('svg')
            .attr("width", 200)
            .attr("height", 50);
        console.log(linechart);

        var linechart_x = d3.time.scale()
            .domain([r.d, new Date(r.d.getTime() + 60 * 60 * 12 * 1000)])
            .range([0, 200]);

        var linechart_y = d3.scale.linear()
            .domain([0, 350])
            .range([50, 0]);

        var linechart_line = d3.svg.line()
            .x(function(d, i) { return linechart_x(d[0]); })
            .y(function(d, i) { return linechart_y(d[1]); });

        var linechart_path = d3.select('#linechart svg')
            .append("path")
            .attr("class", "line");

        var showInterval = function(r) {
            d3.select('#date span + span').text(getWeekdayName(r.d.getDay()));
            d3.select('#date span + span + span').text(r.d.getDate());
            d3.select('div#time').html(zero(r.d.getHours()) + ':' + zero(r.d.getMinutes()));
            var total = paintTable(d3.select('table'), r);
            d3.select('div#total span').text(total);

            // si cambio el dia:
            //  - reseteo el total_bicis
            //  - actualizo la escala porque los sabados son más cortos
            if (r_prev.getDay() != r.d.getDay()) {
                linechart_x = d3.time.scale()
                    .domain([r.d, 
                             new Date(r.d.getTime() + 60 * 60 * (r.d.getDay() == 6 ? 7 : 12) * 1000)])
                    .range([0, 200]);
                total_bicis = [];
            }
            r_prev = r.d;
            total_bicis.push([r.d, total]);

            // buscar el top 5 de viajes
            var top = d3.selectAll('table td')[0]
              .filter(function(a) { 
                  // ademas de filtrarlos, esconderlos.
                  hideLink(a.id.slice(3), '');
                  return a.innerHTML !== ''; 
              })
              .sort(function(a, b) {
                  if (a.innerHTML == '' || b.innerHTML == '') return -100;
                  return parseInt(b.innerHTML) - parseInt(a.innerHTML); 
              })
              .slice(0,5)
              .forEach(function(td) {
                  showLink(td.id.slice(3), td.className);
              });

            // actualizar linechart
            linechart_path
                .attr('d', linechart_line(total_bicis));

        }

        var zero = d3.format('02d');
        d3.select('button#next')
            .on('click', function() { showInterval(recorridos_d.next()) });

        d3.select('button#prev')
            .on('click', function() { showInterval(recorridos_d.prev()) });

        showInterval(r);

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
        .defer(d3.json, "recorridos_marzo_2013.json")
        .await(ready);

    
    
});
