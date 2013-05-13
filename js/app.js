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
        this.position = -1;
        this.total_bicis = [];
    };
    
    // Para acceder facil a la data de recorridos
    RecorridosData.prototype.next = function() {
        if (this.position == this.data.length) return null;
        while (this.position != -1 && this.data[this.position].length < 3) {
            if (this.position == this.data.length) return null;
            this.position++;
        }
        var p = this.parse(this.data[++this.position]);
        this.total_bicis.push([p.d, 
                               p.r.reduce(function(prev, cur) {
                                   return prev + parseInt(cur[2]);
                               }, 0)]);

        return p;
    };

    RecorridosData.prototype.prev = function() {
        if (this.position == 0) return null;
        while (this.data[this.position].length < 3) {
            if (this.position == 0) return null;
            this.position--;
        }
        this.total_bicis.pop();
        var p = this.parse(this.data[--this.position]);
        console.log(p);
        return p;
        
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
            .attr("viewBox", "0 0 20 20")
            .attr("refX", 20)
            .attr("refY", 10)
            .attr('markerUnits', 'strokeWidth')
            .attr("markerWidth", 5)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M 0 0 L 20 10 L 0 20 z");


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
            .attr("marker-end", function(d) { 
                return "url(#marker" + this.id.slice(3)+ ")"; 
            })
            .attr('d', function(d) {
                var source = d3.select('#estacion-' + d[0].EstacionID)[0][0].getBoundingClientRect(); 
                var target = d3.select('#estacion-' + d[1].EstacionID)[0][0].getBoundingClientRect();
//                console.log(source);
                source.left -= 5;
//                console.log(source);
                var dx = target.left - source.left,
                dy = target.top - source.top,
                dr = d[0] != d[1] ? Math.sqrt(dx * dx + dy * dy) : 15;
                return "M" + source.left + "," + source.top + "A" + dr + "," + dr + " 0 " + (d[0] == d[1] ? '1' : '0') + ",1 " + (target.left - 5) + "," + (target.top - 5);
            });

        // para construir la tabla usamos un template de underscorejs
        _.templateSettings.variable = "estaciones";
        var table_template = _.template(d3.select('#table-template').html())
        d3.select('#wrapper').append('table').html(table_template(estaciones_data))

        var showLink = function(id, klass) {
            var arc = d3.select('#arc-' + id)
                .classed(klass == '' ? 'grey' : klass, true)
                .transition()
                .duration(200)
                .style('stroke-opacity', 1)
                .style('fill', 'none');

            d3.select('#marker-' + id)
                .attr('class', klass)
                .transition()
                .duration(200)
                .style('opacity', 1);

        };

        var hideLink = function(id, klass) {
            d3.selectAll('#arc-' + id)
                .classed(klass == '' ? 'grey' : klass, false)
                .transition()
                .duration(200)
                .style('stroke-opacity', 0);

            d3.select('#marker-' + id)
//                .attr('class', null)
                .transition()
                .duration(200)
                .style('opacity', 0);
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
              this.className = null;
              if (this.innerHTML == '❙❙') {
                  this.innerHTML = '▸';
                  d3.selectAll('button#next, button#prev').attr('disabled', null);
                  clearInterval(interval);
              }
              else {
                  this.innerHTML = '❙❙';
                  d3.selectAll('button#next, button#prev').attr('disabled', true);
                  interval = setInterval(function() { showInterval(recorridos_d.next()) }, 1 * 750);
              }
          });

        var r = recorridos_d.next();
        var r_prev = r.d;

        // linechart para el acumulado de bicis en uso
        var linechart = d3.select('#linechart').append('svg')
            .attr("width", 220)
            .attr("height", 60);

        var linechart_x = d3.time.scale()
            .domain([r.d, new Date(r.d.getTime() + 60 * 60 * (r.d.getDay() == 6 ? 7 : 12) * 1000)])
            .range([0, 220]);

        var linechart_xaxis = d3.svg.axis()
            .scale(linechart_x)
            .orient('bottom')
            .ticks(d3.time.hours, 2)
            .tickFormat(d3.time.format('%Hh'))
            .tickSize(0);

        linechart.append('g')
                 .attr('class', 'axis')
                 .attr('transform', 'translate(0,50)')
                 .call(linechart_xaxis);

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
            paintTable(d3.select('table'), r);
            d3.select('div#total span').text(recorridos_d.total_bicis[recorridos_d.total_bicis.length - 1][1]);

            // si cambió el dia:
            //  - reseteo el total_bicis
            //  - actualizo la escala porque los sabados son más cortos
            if (r_prev.getDay() != r.d.getDay()) {
                linechart_x = d3.time.scale()
                    .domain([r.d, 
                             // si es sabado, acorto la escala (7 horas en vez de 12)
                             new Date(r.d.getTime() + 60 * 60 * (r.d.getDay() == 6 ? 7 : 12) * 1000)])
                    .range([0, 220]);
                linechart_xaxis.scale(linechart_x);
                linechart.select('g').call(linechart_xaxis);
                recorridos_d.total_bicis = [];
            }
            r_prev = r.d;

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
              .slice(0,10)
              .forEach(function(td) {
                  showLink(td.id.slice(3), td.className);
              });

            // actualizar linechart
            linechart_path
                .attr('d', linechart_line(recorridos_d.total_bicis));

        }

        var zero = d3.format('02d');
        d3.select('button#next')
            .on('click', function() { var x; if (x = recorridos_d.next()) showInterval(x) });

        d3.select('button#prev')
            .on('click', function() { var x; if (x = recorridos_d.prev()) showInterval(x)  });

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
