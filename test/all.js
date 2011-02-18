var util = require('util'),
    fs = require('fs'),
    spawn = require('child_process').spawn;

process.chdir(__dirname);
var selfFilename = require('path').basename(__filename);

var stopOnFailure = true; // set to true to abort on first failure
var failcount = 0, runcount = 0;
var stderrWrite = process.binding('stdio').writeError;
var files = fs.readdirSync('.').filter(function(fn){
  return (fn !== selfFilename) ? fn.match(/^.+\.(?:mv|js)$/) : null;
}).sort();
var totalcount = files.length;

function done() {
  console.log('>>> ran '+runcount+' of '+totalcount+' tests with '+
              failcount+' failure(s)');
  process.exit(failcount ? 1 : 0);
}

function runNext() {
  fn = files.shift();
  if (!fn || (stopOnFailure && failcount)) return done();
  console.log('>>> run '+fn);
  var nodebin = process.argv[0];
  var args = ["--stack_trace_limit=50"];
  if (fn.match(/\.mv$/)) {
    args = args.concat([
      "-e", "(function(){"+
        "require('../lib');"+
        "require("+JSON.stringify('./'+fn)+");"+
        "process.exit(0);"+
      "})()" ]);
  } else {
    args.push(fn);
  }
  var child = spawn(nodebin, args);
  child.stdin.end();
  child.stdout.on('data', function (data){
    process.stdout.write(data);
  });
  child.stderr.on('data', function (data) {
    if (data.length >= 7 && data.toString('ascii', 0, 7) === 'execvp(') {
      console.error('>>> fail '+fn+' -- execvp('+util.inspect(nodebin)+
        ', '+util.inspect(args)+') failed: '+data.toString('utf8'));
    } else {
      stderrWrite(data);
    }
  });
  child.on('exit', function (code) {
    if (code !== 0) {
      console.log('>>> fail '+fn+' -- status '+code);
      failcount++;
    } else {
      console.log('>>> ok '+fn);
    }
    runcount++;
    runNext();
  });
}

console.log('>>> running '+files.length+' tests');
runNext();
