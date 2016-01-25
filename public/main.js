(function () {
  'use strict';

  var audioContext = new AudioContext();

  function E (tagName, attrs, children) {
    var el = document.createElement(tagName);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      el.appendChild(child);
    });

    return el;
  }

  function T (text) {
    return document.createTextNode(text);
  }

  var counters = [];

  var cmd = function () {
    var ws = new ReconnectingWebSocket('ws://' + window.location.host);
    ws.onmessage = function (e) {
      var signal = JSON.parse(e.data);
      onSignal(signal);
    };
    return {
      countup: function (name) {
        ws.send(JSON.stringify({type: 'update', counter_name: name}));
      }
    };
  }();

  function onSignal (signal) {
    switch (signal.type) {
    case 'counters':
      construct(signal.counters);
      break;
    case 'changed':
      counters[signal.counter_name].update(signal.counter_value);
      break;
    }
  }

  function fetchAudio (path) {
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', path, true);
      request.responseType = 'arraybuffer';
      request.onload = function () {
        resolve(request.response);
      };
      request.onerror = function () {
        reject(err)
      };

      request.send();
    });
  }

  function construct (receivedCounters) {
    var $counters = receivedCounters.map(function (counter) {
      var $value = T(counter.counter_value.toString());
      var $btn = E('img', { src: 'http://placehold.it/300x300' });
      var $elem = (
        E('tr', {}, [
          E('td', {}, [$btn]),
          E('td', {}, [
            E('span', { class: 'count' }, [$value]),
            T(counter.counter_title)
          ])
        ])
      );
      counters[counter.counter_name] = {
        play: function () {
          var source = audioContext.createBufferSource();
          source.connect(audioContext.destination);
          source.buffer = this.buffer;
          source.start();
        },
        update: function (value) {
          $value.nodeValue = value;
        }
      };

      fetchAudio("/audio/" + counter.counter_name + ".mp3").then(function (data) {
        audioContext.decodeAudioData(data, function (buffer) {
          counters[counter.counter_name].buffer = buffer;
        });
      });

      $btn.addEventListener('click', function (e) {
        cmd.countup(counter.counter_name);
        counters[counter.counter_name].play();
      }, false);
      return $elem;
    }, {});
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    document.body.appendChild(E('table', {}, $counters));
  }
})();
