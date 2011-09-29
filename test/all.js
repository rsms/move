var util = require('util'),
    fs = require('fs'),
    spawn = require('child_process').spawn;

process.chdir(__dirname);
var selfFilename = require('path').basename(__filename);

var stopOnFailure = true; // set to true to abort on first failure
var failcount = 0, runcount = 0;
var stderrWrite = process.stderr ? process.stderr.write : process.binding('stdio').writeError;
var files = fs.readdirSync('.').filter(function(fn){
  return (fn !== selfFilename && fn[0] !== '_') ? fn.match(/^.+\.(?:mv|js)$/) : null;
}).sort();
var totalcount = files.length;

function done() {
  var message = '>>> ran '+runcount+' of '+totalcount+' tests';
  if (failcount)
    message += ' with '+failcount+' failure'+(failcount === 1 ? '' : 's');
  else
    message += ' -- all OK';
  console.log(message);
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
        "process.argv.push('--full-test-suite');"+
        "require('../lib');"+
        "require("+JSON.stringify('./'+fn)+");"+
        "process.exit(0);"+
      "})()" ]);
  } else {
    args.push(fn);
    args.push('--full-test-suite');
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
    } //else console.log('>>> ok '+fn);
    runcount++;
    runNext();
  });
}

console.log('>>> running '+files.length+' tests');
runNext();
