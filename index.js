var userId = '';

// Update hash
window.addEventListener('message', (event) => {
  if (event.data?.hash) {
    $('#game_hash_input').val(event.data?.hash);
    const gameAmount = Number($('#game_amount_input').val());
    verify(event.data?.hash, gameAmount);

    if (userId) {
      document.getElementById('ethercrash_user_rounds').attr('src', `https://www.ethercrash.io/user/${userId}`);
    }
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
var gameRedThresold = 2.0;

$('#game_verify_submit').on('click', () => {
  gameRedThresold = Number($('#game_red_thresold_input').val());

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
  [3, 5, 10, 20, 50, 100].forEach((v) => showRangeAnalysis(data, v));

  showSequenceRed();
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
  avgDelta = totalDelta / (aboveItems.length - 1);

  if (!aboveItems.length) {
    minDelta = avgDelta = maxDelta = 0;
  }

  if (aboveItems.length === 1) {
    minDelta = avgDelta = maxDelta = aboveItems[0].index;
  }

  var $div = $('<div>').css('margin-bottom', 10);
  var $label = $('<label>').text(`Above x${bust} : ${aboveItems.length}`).css('font-weight', 'bold').css('color', '#20ad6c');
  var $label2 = $('<label>').text(subString(aboveRounds, 45));
  var $label3 = $('<label>')
    .text(`Distance - min: ${minDelta}, avg: ${Math.round(avgDelta)}, max: ${maxDelta}`)
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

  showSequenceRed();
  drawChart();
}

function showSequenceRed() {
  var seq_red_count = 0;
  var max_seq_red_count = 0;

  data.forEach(d => {
    if (d.bust < gameRedThresold) {
      seq_red_count++;
    } else {
      max_seq_red_count = Math.max(seq_red_count, max_seq_red_count);
      seq_red_count = 0;
    }
  });

  $('#game_max_red_sequence_count_in_table').text(max_seq_red_count);
  $('#game_max_red_sequence_count_in_chart').text(max_seq_red_count);
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
          class: bust >= gameRedThresold ? 'is-over-median' : 'is-under-median',
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
  let salt = $('#game_salt_input').val();
  let prevHash = null;
  for (let index = 0; index < gameAmount; index++) {
    let hash = String(prevHash ? CryptoJS.SHA256(String(prevHash)) : gameHash);
    let bust = salt.startsWith('0x') ? gameResultForEthercrash(hash, salt) : gameResult(hash, salt);
    yield { hash, bust };

    prevHash = hash;
  }
}

function divisible(hash, mod) {
  // So ABCDEFGHIJ should be chunked like  AB CDEF GHIJ
  var val = 0;

  var o = hash.length % 4;
  for (var i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
}

function hmac(key, v) {
  var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
  return hmacHasher.finalize(v).toString();
}

function gameResultForEthercrash(serverSeed, salt) {
  // see: provably fair seeding event https://bitcointalk.org/index.php?topic=4959619
  //Block 6217364 0xd8b8a187d5865a733680b4bf4d612afec9c6829285d77f438cd70695fb946801
  var hash = hmac(serverSeed, salt);

  // In 1 of 101 games the game crashes instantly.
  if (divisible(hash, 101)) return 0;

  // Use the most significant 52-bit from the hash to calculate the crash point
  var h = parseInt(hash.slice(0, 52 / 4), 16);
  var e = Math.pow(2, 52);

  return (Math.floor((100 * e - h) / (e - h)) / 100).toFixed(2);
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

var mychart = null;

function drawChart() {
  const ctx = document.getElementById('chartjs_container');

  const chartData = {
    labels: data.map((d) => d.bust),
    datasets: [
      {
        label: '',
        data: data.map((d) => d.bust),
        backgroundColor: (ctx) => {
          if (ctx.raw < gameRedThresold) {
            return 'red';
          } else if (ctx.raw >= 48) {
            return '#e69b00';  // dark yellow
          } else if (ctx.raw >= 9.8) {
            return 'yellow';
          }

          return 'green';
        },
      },
    ],
  };

  const config = {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      scales: {
        x: {
          grid: {
            offset: false,
          },
          ticks: {
            autoSkip: data.length > 50 ? true : false,
          },
        },
        y: {
          beginAtZero: true,
          max: 50,
          ticks: {
            callback: function (value, index, ticks) {
              return value + ' x';
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  };

  if (mychart) {
    mychart.destroy();
  }

  mychart = new Chart(ctx, config);
}

$('#game_verify_submit').click();

// Salt change
$('#bustabit_salt_button').on('click', () => {
  $('#game_salt_input').val('0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526');
});

$('#ethercrash_salt_button').on('click', () => {
  $('#game_salt_input').val('0xd8b8a187d5865a733680b4bf4d612afec9c6829285d77f438cd70695fb946801');
});

$('#bcgame_salt_button').on('click', () => {
  $('#game_salt_input').val('000000000000000000030587dd9ded1fcc5d603652da58deb670319bd2e09445');
});

var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
    }
  }
  return false;
};

$(function () {
  var game = getUrlParameter('game');
  if (game === 'ethercrash') {
    $('#game_salt_input').val('0xd8b8a187d5865a733680b4bf4d612afec9c6829285d77f438cd70695fb946801');
  } else if (game === 'bustabit') {
    $('#game_salt_input').val('0000000000000000004d6ec16dafe9d8370958664c1dc422f452892264c59526');
  }

  userId = getUrlParameter('userid');
  if (userId) {
    $('#ethercrash_user_rounds').attr('src', `https://www.ethercrash.io/user/${userId}`);
    $('#user_rounds_tab').removeClass('is-hidden');
  }
});
