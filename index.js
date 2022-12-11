// Update hash
window.addEventListener('message', (event) => {
  if (event.data?.hash) {
    $('#game_hash_input').val(event.data?.hash);
    const gameAmount = Number($('#game_amount_input').val());
    verify(event.data?.hash, gameAmount);
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
  $lis.removeClass('is-active');
  $li.addClass('is-active');
  $(`#${id}-content > div`).addClass('is-hidden');
  $(`#${id}-content > div:eq(${index})`).removeClass('is-hidden');
});

function enterLoadState() {
  $('#game_hash_input').parent().addClass('is-loading');
  $('#game_salt_input').parent().addClass('is-loading');
  $('#game_verify_submit, #chart_plus_1_submit, #chart_plus_10_submit, #chart_plus_100_submit').addClass('is-loading');
  $('#game_hash_input, #game_salt_input, #game_amount_input, #game_verify_submit').attr('disabled', 'disabled');
  $('#game_verify_table').html('');
}
function exitLoadState() {
  $('#game_hash_input').parent().removeClass('is-loading');
  $('#game_salt_input').parent().removeClass('is-loading');
  $('#game_verify_submit, #chart_plus_1_submit, #chart_plus_10_submit, #chart_plus_100_submit').removeClass('is-loading');
  $('#game_hash_input, #game_salt_input, #game_amount_input, #game_verify_submit').removeAttr('disabled');
}

var $range = $('.range-analysis');

var isVerifying = false;
var data = [];

$('#game_verify_submit').on('click', () => {
  const gameHash = $('#game_hash_input').val();
  const gameAmount = Number($('#game_amount_input').val());
  verify(gameHash, gameAmount);
});

function verify(gameHash, gameAmount) {
  if (isVerifying) return;
  isVerifying = true;
  enterLoadState();
  $range.empty();

  data = [];
  var index = 0;
  for (let item of gameResults(gameHash, gameAmount)) {
    setTimeout(addTableRow.bind(null, item.hash, item.bust, data.length), data.length * 1);
    data.unshift({ ...item, index: ++index });
  }

  // Range Analysis
  [5, 10, 20, 50, 100].forEach((v) => showRangeAnalysis(data, v));

  drawChart();
}

function showRangeAnalysis(data, bust) {
  var aboveItems = data.filter((v) => v.bust >= bust);

  var delta = 0,
    totalDelta = 0,
    minDelta = 99999,
    avgDelta = 0,
    maxDelta = 0;
  var aboveRounds = '';

  var lastIndex = 0;
  aboveItems.reverse().forEach((item) => {
    aboveRounds && (aboveRounds += ', ');
    aboveRounds += `x${item.bust}/${item.index}`;

    if (lastIndex > 0) {
      delta = item.index - lastIndex;

      if (delta < minDelta) {
        minDelta = delta;
      }

      if (delta > maxDelta) {
        maxDelta = delta;
      }

      totalDelta += delta;
    }

    lastIndex = item.index;
  });
  avgDelta = totalDelta / aboveItems.length;

  if (!aboveItems.length) {
    minDelta = avgDelta = maxDelta = 0;
  }

  if (aboveItems.length === 1) {
    minDelta = avgDelta = maxDelta = aboveItems[0].index;
  }

  if (aboveItems.length === 2) {
    avgDelta = maxDelta = aboveItems[1].index;
  }

  var $div = $('<div>').css('margin-bottom', 10);
  var $label = $('<label>').text(`Above x${bust} : ${aboveItems.length}`).css('font-weight', 'bold').css('color', '#20ad6c');
  var $label2 = $('<label>').text(subString(aboveRounds, 45));
  var $label3 = $('<label>')
    .text(`Distance - min: ${minDelta}, avg: ${Math.floor(avgDelta)}, max: ${maxDelta}`)
    .css('font-weight', '500');

  [$label, $label2, $label3].forEach((el) => $div.append(el.css('display', 'block')));
  $range.append($div);
}

function subString(text, limitLength) {
  if (text.length > limitLength) {
    return text.substring(0, limitLength) + '...';
  } else {
    return text;
  }
}

function drawChart() {
  let svg = d3.select('#multiplier_averages_chart').html('');
  bustabitLineChart({ svg, data });

  // rev = data.reverse();
  // for(i = 49; i < 53; i++) {
  //   console.log(rev[i].index, rev[i].bust);
  // }
  // console.log('---------------')
}

function gameResultsAdd(data, amount) {
  var index = data[0].index;
  var hash = CryptoJS.SHA256(data[0].hash);

  for (let item of gameResults(hash, amount)) {
    setTimeout(addTableRow.bind(null, item.hash, item.bust, data.length), data.length * 1);
    data.unshift({ ...item, index: ++index });
  }

  // Range Analysis
  $range.empty();
  [5, 10, 20, 50, 100].forEach((v) => showRangeAnalysis(data, v));

  drawChart();
}

$('#chart_plus_1_submit').on('click', () => {
  let $amountInput = $('#game_amount_input');
  gameResultsAdd(data, 1);
  $amountInput.val(data.length);
});
$('#chart_plus_10_submit').on('click', () => {
  let $amountInput = $('#game_amount_input');
  gameResultsAdd(data, 10);
  $amountInput.val(data.length);
});
$('#chart_plus_100_submit').on('click', () => {
  let $amountInput = $('#game_amount_input');
  gameResultsAdd(data, 100);
  $amountInput.val(data.length);
});

$('#game_amount_input').on('keyup', () => {
  if ($('#game_amount_input').val() >= 10000) {
    if ($('#game_verify_warning').length) return;
    $('#game_verify_submit')
      .parent()
      .append(
        $('<span/>')
          .attr({
            id: 'game_verify_warning',
            class: 'tag is-warning',
          })
          .text('Verifying a huge amount of games may consume more ressources from your CPU')
      );
  } else {
    if ($('#game_verify_warning').length) {
      $('#game_verify_warning').remove();
    }
  }
});

const addTableRow = (hash, bust, index) => {
  $('<tr/>')
    .attr({
      class: index === 0 ? 'is-first' : null,
    })
    .append($('<td/>').text(hash))
    .append(
      $('<td/>')
        .text(bust)
        .attr({
          class: bust === 1.98 ? 'is-at-median' : bust > 1.98 ? 'is-over-median' : 'is-under-median',
        })
    )
    .appendToWithIndex($('#game_verify_table'), index);

  if (index >= $('#game_amount_input').val() - 1) {
    exitLoadState();
    isVerifying = false;
  }
};
$.fn.appendToWithIndex = function (to, index) {
  if (!(to instanceof jQuery)) {
    to = $(to);
  }
  if (index === 0) {
    $(this).prependTo(to);
  } else {
    $(this).insertAfter(to.children().eq(index - 1));
  }
};

function prob(multiplier) {
  if (Array.isArray(multiplier)) {
    return multiplier.reduce((accumulator, item) => {
      return accumulator * prob(item);
    }, 1);
  } else if (!isNaN(multiplier)) {
    return 0.99 / multiplier;
  } else {
    throw new Error(`multiplier must be a number or array instead of '${typeof multiplier}'.`);
  }
}
prob.invert = function (probability) {
  if (Array.isArray(probability)) {
    let result = [];
    if (probability.length > 0) result[0] = prob.invert(probability[0]);
    for (let i = 1; i < probability.length; i++) {
      result.push(prob.invert(probability[i] / probability[i - 1]));
      if (result[result.length - 1] < 1.01) {
        throw new Error(`probability[${i}] is impossible.`);
      }
    }
    return result;
  } else if (!isNaN(probability)) {
    return 0.99 / probability;
  } else {
    throw new Error(`probability must be a number or array instead of '${typeof probability}'.`);
  }
};

function* gameResults(gameHash, gameAmount) {
  let prevHash = null;
  for (let index = 0; index < gameAmount; index++) {
    let hash = String(prevHash ? CryptoJS.SHA256(String(prevHash)) : gameHash);
    let bust = gameResult(hash, $('#game_salt_input').val());
    yield { hash, bust };

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
  arguments[0].options = Object.assign(
    {
      xAccessor: function (d, i) {
        return i;
      },
      yAccessor: function (d) {
        return prob(d.bust);
      },
      xFormat: function (x) {
        return x;
      },
      yFormat: function (y) {
        return y * 100 + ' %';
      },
    },
    arguments[0].options
  );

  const settings = lineChartSettings(arguments[0]);

  svg = lineChart(settings);

  const { width, height, xScale, yScale, xAccessor, yAccessor, lineX } = settings;

  // y-axis (right)
  const main = svg.select('g');

  main
    .append('g')
    .attr('class', 'y-axis axis')
    .attr('transform', 'translate( ' + width + ', 0 )')
    .call(
      d3.axisRight(yScale).tickFormat((y) => {
        return 'x ' + Math.floor(99 / y) / 100;
      })
    );

  main
    .append('g')
    .append('line')
    .attr('class', 'line base-line')
    .attr('x1', xScale(0))
    .attr('x2', xScale(d3.max(data, xAccessor)))
    .attr('y1', yScale(0.5))
    .attr('y2', yScale(0.5))
    .style('opacity', 0.5);

  return svg;
}

const lineChartSettings = (function () {
  function LineChartSettings({ svg, data, options }) {
    options = Object.assign({}, this.defaultOptions, options);

    const { xAccessor, yAccessor, xFormat, yFormat, margin } = options;

    const width = svg.attr('width') - margin.left - margin.right,
      height = svg.attr('height') - margin.top - margin.bottom,
      xScale = d3
        .scaleLinear()
        .domain([d3.min(data, xAccessor), d3.max(data, xAccessor)])
        .range([0, width]),
      yScale = d3
        .scaleLinear()
        .domain([d3.min(data, yAccessor), d3.max(data, yAccessor)])
        .range([0, height])
        .nice(),
      xAxis = d3.axisBottom(xScale).tickFormat(xFormat),
      yAxis = d3.axisLeft(yScale).tickFormat(yFormat),
      line = d3
        .line()
        .x(function (d, i) {
          return xScale(xAccessor(d, i));
        })
        .y(function (d, i) {
          return yScale(yAccessor(d, i));
        }),
      lineX = line.x(),
      lineY = line.y();

    this.svg = svg;
    this.data = data;
    this.xAccessor = xAccessor;
    this.yAccessor = yAccessor;
    this.xFormat = xFormat;
    this.yFormat = yFormat;
    this.margin = margin;
    this.width = width;
    this.height = height;
    this.xScale = xScale;
    this.yScale = yScale;
    this.line = line;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.lineX = lineX;
    this.lineY = lineY;
  }
  LineChartSettings.prototype = {
    defaultOptions: {
      xAccessor: function (d, i) {
        return i;
      },
      yAccessor: function (d) {
        return d;
      },
      xFormat: function (x) {
        return x;
      },
      yFormat: function (y) {
        return y;
      },
      margin: { top: 50, right: 50, bottom: 50, left: 50 },
    },
  };
  return function ({ svg, data, options }) {
    return new LineChartSettings(arguments[0]);
  };
})();

function lineChart(settings) {
  const { svg, data, xAccessor, yAccessor, xFormat, yFormat, margin, width, height, xScale, yScale, line, xAxis, yAxis, lineX, lineY } = settings;

  // container, to apply margin
  const main = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // x-axis
  main
    .append('g')
    .attr('class', 'x-axis axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);
  // y-axis
  main.append('g').attr('class', 'y-axis axis').call(yAxis);

  // data line
  main.append('g').append('path').datum(data).attr('class', 'line data-line').attr('d', line);

  // append a circle for each data point
  const dotRadius = 3;
  main.append('g').selectAll('.dot').data(data).enter().append('circle').attr('class', 'dot').attr('cx', lineX).attr('cy', lineY).attr('r', dotRadius);

  var focus = main.append('g').attr('class', 'focus').style('display', 'none');
  focus.append('circle').attr('r', dotRadius * 0.9);
  focus
    .append('text')
    .attr('x', dotRadius * 0.9 + 10)
    .attr('dy', '.35em');

  main
    .append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .on('mouseover', function () {
      focus
        .style('display', null)
        .transition()
        .styleTween('opacity', function () {
          return d3.interpolate(0, 1);
        });
    })
    .on('mouseout', function () {
      focus
        .transition()
        .styleTween('opacity', function () {
          return d3.interpolate(1, 0);
        })
        .transition()
        .style('display', 'none');
    })
    .on('mousemove', mousemove);

  const xCoordinates = data.map(xAccessor);
  function mousemove() {
    var x0 = xScale.invert(d3.mouse(this)[0]);
    var i = d3.bisectLeft(xCoordinates, x0, 1),
      d0 = data[i - 1],
      d1 = data[i];
    if (!d0 || !d1) return;
    var d, dindex;
    if (x0 - xAccessor(d0, i - 1) > xAccessor(d1, i) - x0) {
      d = d1;
      dindex = i;
    } else {
      d = d0;
      dindex = i - 1;
    }
    focus.style('display', null).attr('transform', 'translate(' + lineX(d, dindex) + ',' + lineY(d, dindex) + ')');

    let color = d.bust == 1.98 ? 'orange' : d.bust > 1.98 ? 'green' : 'red';
    focus.select('text').attr('fill', color).text(`x ${d.bust} / ${d.index}`);
  }

  return svg;
}

$('#game_verify_submit').click();
