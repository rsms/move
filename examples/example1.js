var util = require('util');
var move = require("../lib");

var m = require('./example1-subject');
console.log(m.ping(1, 'Hello'))
console.log(m.source())

var startTime = new Date;
var code = move.compileFileSync('./example1-subject.mv');
console.log('------------------\n'+
            'parser real time spent: '+((new Date)-startTime)+'ms\n'+
            '------------------');
console.log(code);
