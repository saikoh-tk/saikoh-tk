'use strict';

const events = require('events');
const winston = require('winston');
const config = require('config');
const promisify = require("es6-promisify");
const pubsub = require('./pubsub');
const redis = require('./redis');

class Counter extends events.EventEmitter {
  constructor(name, title) {
    if (Counter.counters.has(name)) {
      return Counter.counters.get(name);
    }
    super();
    this.name = name;
    this.title = title;
    this._value = 0;

    this.eventName = `counter::${name}`;

    this._getValue().then((value) => {
      this.value = value;
    });
    pubsub.on(this.eventName, this._onChange.bind(this));
    Counter.counters.set(name, this);
    return this;
  }

  _onChange(value) {
    this.value = value;
  }

  _getValue() {
    return redis.get(this.name);
  }

  countup() {
    return redis.incr(this.name).then((value) => {
      this.value = value;
      pubsub.emit(this.eventName, this.value);
    }).catch(winston.error);
  }

  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
    this.emit('value', value);
  }
}

Counter.counters = new Map();

module.exports = Counter;

if (!module.parent) {
  new Counter('saikoh').countup();
}
