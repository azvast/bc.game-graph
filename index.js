// Update hash
window.addEventListener('message', (event) => {
  if (event.data?.hash) {
    $('#game_hash_input').val(event.data?.hash);
	  const gameAmount = Number($('#game_amount_input').val());
	  verify(gameHash, gameAmount);
  }
});

// making bulma.css tabs work
$('.tabs ul li a').click(function () {
  const $this = $(this),
    $tabs = $this.closest('.tabs'),
    $li = $this.closest('li'),
    $lis = $tabs.find('ul > li');
  const id = $tabs.attr('id'),
    index = $lis.index($li);
  $lis.removeClass('is-active')
  $li.addClass('is-active')
  $(`#${id}-content > div`).addClass('is-hidden')
  $(`#${id}-content > div:eq(${index})`).removeClass('is-hidden')
});

function enterLoadState() {
  $('#game_hash_input').parent().addClass('is-loading');
  $('#chart_plus_1_submit, #chart_plus_10_submit, #chart_plus_100_submit').addClass('is-loading');
  $('#game_hash_input, #game_amount_input').attr('disabled', 'disabled');
  $('#game_verify_table').html('');
}
function exitLoadState() {
  $('#game_hash_input').parent().removeClass('is-loading');
  $('#chart_plus_1_submit, #chart_plus_10_submit, #chart_plus_100_submit').removeClass('is-loading');
  $('#game_hash_input, #game_amount_input').removeAttr("disabled");
}

var isVerifying = false;
var data = []

function verify(gameHash, gameAmount) {
  if (isVerifying) return;
  isVerifying = true;
  enterLoadState()

  data = []
  for (let item of gameResults(gameHash, gameAmount)) {
    setTimeout(addTableRow.bind(null, item.hash, item.bust, data.length), data.length * 1)
    data.unshift(item)
  }

  drawChart()
}

function drawChart() {

  function sum(arr, func) {
    func = func || function (d) { return d }
    var len = arr.length;
    var num = 0;
    while (len--) num += Number(func(arr[len], len, arr));
    return num;
  }

  function avg(arr, idx, range, func) {
    func = func || function (d) { return d }
    return sum(arr.map(func).slice(idx - range, idx)) / range;
  }

  function sma(arr, range, key, func) {
    if (!Array.isArray(arr)) {
      throw new TypeError('expected first argument to be an array');
    }
    key = key || `sma_${range}`;
    var len = arr.length;
    var i = range - 1;
    while (++i < len) {
      arr[i][key] = avg(arr, i, range, func)
    }
    return arr;
  }

  function ema(arr, range, key, func) {
    if (!Array.isArray(arr)) {
      throw new TypeError('expected first argument to be an array');
    }
    key = key || `ema_${range}`;
    func = func || function (d) { return d }
    var len = arr.length;
    var k = 2 / (range + 1);
    // first item is just the same as the first item in the input
    arr[0][key] = func(arr[0])
    arr[0][key] = arr[0][key]
    // for the rest of the items, they are computed with the previous one

    for (var i = 1; i < len; i++) {

      arr[i][key] = (func(arr[i]) * k + arr[i - 1][key] * (1 - k));
      arr[i][key] = arr[i][key]
    }
    return arr;
  }

  sma(data, Number($("#sma_short_input").val()), 'sma_short', d => prob(d.bust))
  sma(data, Number($("#sma_long_input").val()), 'sma_long', d => prob(d.bust))

  ema(data, Number($("#ema_short_input").val()), 'ema_short', d => prob(d.bust))
  // ema(data, Number($("#ema_long_input").val()), 'ema_long', d => prob(d.bust))

  let svg = d3.select("#multiplier_averages_chart").html('')
  bustabitLineChart({ svg, data })

}

// line chart checkboxes to show/hide lines
$(document).ready(function () {
  ['base-line', 'data-line', 'ema-line', 'sma-line'].forEach(linename => {
    function handleChange() {
      let $this = this
      if (!($this instanceof jQuery)) {
        $this = $(this)
      }
      let linename = $this.attr('id').replace('chart-show-', '')
      if ($this.is(':checked')) {
        $(`.${linename}`).fadeIn()
      } else {
        $(`.${linename}`).fadeOut()
      }
    }
    let $checkbox = $(`#chart-show-${linename}`)
    $checkbox.on('change', handleChange);
    handleChange.call($checkbox)
  })


  $('#chart-show-data-line').on('change', function () {
    if ($(this).is(':checked')) {
      $('.dot, .focus').fadeIn();
      $('.overlay').attr('style', null)
    } else {
      $('.dot, .focus').fadeOut();
      $('.overlay').attr('style', 'display: none;')
    }
  })
})

function gameResultsAdd(data, amount) {
  for (let item of gameResults(data[0].hash, amount)) {
    setTimeout(addTableRow.bind(null, item.hash, item.bust, data.length), data.length * 1)
    data.unshift(item)
  }
  drawChart()
}

$('#chart_plus_1_submit').on('click', () => {
  let $amountInput = $('#game_amount_input')
  gameResultsAdd(data, 1)
  $amountInput.val(data.length);
});
$('#chart_plus_10_submit').on('click', () => {
  let $amountInput = $('#game_amount_input')
  gameResultsAdd(data, 10)
  $amountInput.val(data.length);
});
$('#chart_plus_100_submit').on('click', () => {
  let $amountInput = $('#game_amount_input')
  gameResultsAdd(data, 100)
  $amountInput.val(data.length);
});

$('#game_amount_input').on('keyup', () => {
  if ($('#game_amount_input').val() >= 10000) {
    if ($('#game_verify_warning').length) return;
  } else {
    if ($('#game_verify_warning').length) {
      $('#game_verify_warning').remove();
    }
  }
});

const addTableRow = (hash, bust, index) => {
  $('<tr/>').attr({
    'class': index === 0 ? 'is-first' : null
  }).append(
    $('<td/>').text(hash)
  ).append(
    $('<td/>').text(bust).attr({
      'class': bust === 1.98 ? 'is-at-median' : bust > 1.98 ? 'is-over-median' : 'is-under-median'
    })
  ).appendToWithIndex($('#game_verify_table'), index);

  if (index >= $('#game_amount_input').val() - 1) {
    exitLoadState()
    isVerifying = false;
  }
};
$.fn.appendToWithIndex = function (to, index) {
  if (!(to instanceof jQuery)) {
    to = $(to);
  }
  if (index === 0) {
    $(this).prependTo(to)
  } else {
    $(this).insertAfter(to.children().eq(index - 1));
  }
};


function prob(multiplier) {
  if (Array.isArray(multiplier)) {
    return multiplier.reduce((accumulator, item) => {
      return accumulator * prob(item)
    }, 1);
  } else if (!isNaN(multiplier)) {
    return 0.99 / multiplier
  } else {
    throw new Error(`multiplier must be a number or array instead of '${typeof (multiplier)}'.`)
  }
}
prob.invert = function (probability) {
  if (Array.isArray(probability)) {
    let result = []
    if (probability.length > 0) result[0] = prob.invert(probability[0])
    for (let i = 1; i < probability.length; i++) {
      result.push(prob.invert(probability[i] / probability[i - 1]))
      if (result[result.length - 1] < 1.01) {
        throw new Error(`probability[${i}] is impossible.`)
      }
    }
    return result
  } else if (!isNaN(probability)) {
    return 0.99 / probability
  } else {
    throw new Error(`probability must be a number or array instead of '${typeof (probability)}'.`)
  }
}

function* gameResults(gameHash, gameAmount) {
  let prevHash = null;
  for (let index = 0; index < gameAmount; index++) {
    let hash = String(prevHash ? CryptoJS.SHA256(String(prevHash)) : gameHash);
    let bust = gameResult(hash, '000000000000000000030587dd9ded1fcc5d603652da58deb670319bd2e09445');
    yield { hash, bust }

    prevHash = hash;
  }
}

function gameResult(seed, salt) {
  const nBits = 52; // number of most significant bits to use

  // 1. HMAC_SHA256(message=seed, key=salt)  
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), salt);
  seed = hmac.toString(CryptoJS.enc.Hex);

  // 2. r = 52 most significant bits
  seed = seed.slice(0, nBits / 4);
  const r = parseInt(seed, 16);

  // 3. X = r / 2^52
  let X = r / Math.pow(2, nBits); // uniformly distributed in [0; 1)

  // 4. X = 99 / (1-X)
  X = 99 / (1 - X);

  // 5. return max(trunc(X), 100)
  const result = Math.floor(X);
  return Math.max(1, result / 100);
}

function bustabitLineChart({ svg, data, options }) {
  arguments[0].options = Object.assign({
    xAccessor: function (d, i) { return i },
    yAccessor: function (d) { return prob(d.bust) },
    xFormat: function (x) { return x },
    yFormat: function (y) { return (y * 100) + ' %' },
  }, arguments[0].options)

  const settings = lineChartSettings(arguments[0])

  svg = lineChart(settings)

  const { width, height, xScale, yScale, xAccessor, yAccessor, lineX } = settings

  // y-axis (right)
  const main = svg.select("g")

  main.append("g")
    .attr("class", "y-axis axis")
    .attr("transform", "translate( " + width + ", 0 )")
    .call(d3.axisRight(yScale)
      .tickFormat(y => { return 'x ' + (Math.floor(99 / y) / 100) }));

  main.append("g")
    .append("line")
    .attr("class", "line base-line")
    .attr("x1", xScale(0))
    .attr("x2", xScale(d3.max(data, xAccessor)))
    .attr("y1", yScale(0.5))
    .attr("y2", yScale(0.5))
    .style('opacity', $('#chart-show-base-line').is(':checked') ? null : 'none')

  main.append("g")
    .append("path")
    .datum(data)
    .attr("class", "line sma-long-line sma-line")
    .attr("d", d3.line()
      .defined(function (d) { return !isNaN(d.sma_long) })
      .x(lineX)
      .y(function (d) { return yScale(d.sma_long); }))
    .style('display', $('#chart-show-sma-line').is(':checked') ? null : 'none')
  main.append("g")
    .append("path")
    .datum(data)
    .attr("class", "line sma-short-line sma-line")
    .attr("d", d3.line()
      .defined(function (d) { return !isNaN(d.sma_short) })
      .x(lineX)
      .y(function (d) { return yScale(d.sma_short); }))
    .style('display', $('#chart-show-sma-line').is(':checked') ? null : 'none')
  main.append("g").append("path")
    .datum(data)
    .attr("class", "line ema-long-line ema-line")
    .attr("d", d3.line()
      .defined(function (d) { return !isNaN(d.ema_long) })
      .x(lineX)
      .y(function (d) { return yScale(d.ema_long); }))
    .style('display', $('#chart-show-ema-line').is(':checked') ? null : 'none')
  main.append("g").append("path")
    .datum(data)
    .attr("class", "line ema-short-line ema-line")
    .attr("d", d3.line()
      .defined(function (d) { return !isNaN(d.ema_short) })
      .x(lineX)
      .y(function (d) { return yScale(d.ema_short); }))
    .style('display', $('#chart-show-ema-line').is(':checked') ? null : 'none')
  return svg
}

const lineChartSettings = (function () {
  function LineChartSettings({ svg, data, options }) {
    options = Object.assign({}, this.defaultOptions, options)

    const { xAccessor, yAccessor, xFormat, yFormat, margin } = options;

    const width = svg.attr("width") - margin.left - margin.right,
      height = svg.attr("height") - margin.top - margin.bottom,
      xScale = d3.scaleLinear()
        .domain([d3.min(data, xAccessor), d3.max(data, xAccessor)])
        .range([0, width]),
      yScale = d3.scaleLinear()
        .domain([d3.min(data, yAccessor), d3.max(data, yAccessor)])
        .range([0, height])
        .nice(),
      xAxis = d3.axisBottom(xScale).tickFormat(xFormat),
      yAxis = d3.axisLeft(yScale).tickFormat(yFormat),
      line = d3.line()
        .x(function (d, i) { return xScale(xAccessor(d, i)); })
        .y(function (d, i) { return yScale(yAccessor(d, i)); }),
      lineX = line.x(),
      lineY = line.y();

    this.svg = svg
    this.data = data
    this.xAccessor = xAccessor
    this.yAccessor = yAccessor
    this.xFormat = xFormat
    this.yFormat = yFormat
    this.margin = margin
    this.width = width
    this.height = height
    this.xScale = xScale
    this.yScale = yScale
    this.line = line
    this.xAxis = xAxis
    this.yAxis = yAxis
    this.lineX = lineX
    this.lineY = lineY
  }
  LineChartSettings.prototype = {
    defaultOptions: {
      xAccessor: function (d, i) { return i },
      yAccessor: function (d) { return d },
      xFormat: function (x) { return x },
      yFormat: function (y) { return y },
      margin: { top: 50, right: 50, bottom: 50, left: 50 }
    }
  };
  return function ({ svg, data, options }) {
    return new LineChartSettings(arguments[0])
  }
})();

function lineChart(settings) {
  const { svg, data, xAccessor, yAccessor, xFormat, yFormat, margin, width, height, xScale, yScale, line, xAxis, yAxis, lineX, lineY } = settings

  // container, to apply margin
  const main = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // x-axis
  main.append("g")
    .attr("class", "x-axis axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
  // y-axis
  main.append("g")
    .attr("class", "y-axis axis")
    .call(yAxis);
    
  // data line
  main.append("g")
    .append("path")
    .datum(data)
    .attr("class", "line data-line")
    .attr("d", line);

  // append a circle for each data point 
  const dotRadius = 3;
  main.append("g").selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", lineX)
    .attr("cy", lineY)
    .attr("r", dotRadius);

  var focus = main.append("g")
    .attr("class", "focus")
    .style("display", 'none')
  focus.append("circle")
    .attr("r", dotRadius * 0.9);
  focus.append("text")
    .attr("x", (dotRadius * 0.9) + 10)
    .attr("dy", ".35em");

  main.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .on("mouseover", function () {
      focus.style('display', null)
        .transition()
        .styleTween('opacity', function () { return d3.interpolate(0, 1); })
    })
    .on("mouseout", function () {
      focus.transition()
        .styleTween('opacity', function () { return d3.interpolate(1, 0); })
        .transition()
        .style('display', 'none')
    })
    .on("mousemove", mousemove);

  const xCoordinates = data.map(xAccessor)
  function mousemove() {
    var x0 = xScale.invert(d3.mouse(this)[0]);
    var
      i = d3.bisectLeft(xCoordinates, x0, 1),
      d0 = data[i - 1],
      d1 = data[i];
    if (!d0 || !d1) return;
    var d, dindex;
    if (x0 - xAccessor(d0, i - 1) > xAccessor(d1, i) - x0) {
      d = d1
      dindex = i
    } else {
      d = d0
      dindex = i - 1
    }
    focus.style('display', null).attr("transform", "translate(" + lineX(d, dindex) + "," + lineY(d, dindex) + ")");

    let color = d.bust == 1.98 ? 'orange' : (d.bust > 1.98 ? 'green' : 'red')
    focus.select("text").attr('fill', color).text('x ' + d.bust);
  }

  return svg
}
