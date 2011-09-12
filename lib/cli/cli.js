var sys = require('sys'),
    fs = require('fs'),
    optparse = require('./optparse');

// String additions
if (String.prototype.repeat === undefined)
String.prototype.repeat = function(times) {
  var v = [], i=0;
  for (; i < times; v.push(this), i++);
  return v.join('');
}

if (String.prototype.fillRight === undefined)
String.prototype.fillRight = function(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
}

// todo: check if we are doing output to a terminal (otherwise we do not 
// want this to be true)
exports.isTerminal = 'TERM' in process.env;
exports.isColorTerminal = exports.isTerminal && 
  process.env.TERM.toLowerCase().indexOf('color');

(function(){
function Program(options) {
  process.EventEmitter.call(this);
  this.cmd = {};
  this.options = options || [];
  var self = this;
  process.addListener("uncaughtException", function(exc){
    self.exit(exc);
  });
}
sys.inherits(Program, process.EventEmitter);
exports.Program = Program;

// exit([int status], [Error], [message])
Program.prototype.exit = function (status, error, message) {
  if (typeof status === 'object') {
    error = status;
    status = undefined;
  } else if (typeof status === 'string') {
    message = status;
    status = undefined;
  }
  
  if (typeof error === 'string') {
    message = error;
    error = undefined;
  }
  
  if (error) {
    if (!status) status = 1;
    if (exports.isColorTerminal)
      fs.writeSync(1, '\033[1;31m');
    message = String(error.stack || error);
  }
  
  if (message && message.length) {
    process.stderr.write(message+'\n');
  }

  this.emit("exit", status);
  process.exit(status);
}

Program.prototype.log = function(msg, verbose) {
  if (verbose && !this.options.verbose)
    return;
  if (this.logSync)
    fs.writeSync(this.logFd || 0, msg+'\n');
  else
    fs.writeSync(this.logFd || 0, msg+'\n');
}

Program.prototype.getCommand = function(argv, canonicalName) {
  var command = this.cmd[canonicalName];
  if (command) {
    command.name = canonicalName;
    command.program = this;
    // parse command arguments
    var options = {};
    if (Array.isArray(command.options) && command.options.length) {
      options = optparse.options(argv, command.options, function(){
        this.stop_on_unknown();
      });
      command.optionParser = optparse.p;
      command.parsedOptions = options;
    }
    command.argv = Array.prototype.slice.call(argv);
  }
  return command;
}

exports.cmd_help = {
  desc: 'Display help for a command.',
  options: [
    'Usage: .. help <command>',
  ],
  main: function(argv, options) {
    if (!argv.length) {
      this.optionParser.educate('error: missing command after "help"');
      this.program.exit(1);
    }
    var commandName = argv.shift().toLowerCase();
    var command = this.program.getCommand([], commandName);
    if (!command) {
      this.optionParser.educate('Unknown command '+JSON.stringify(commandName));
      this.program.exit(1);
    }
    if (command.optionParser)
      command.optionParser.educate();
    else
      sys.error('No help for command '+sys.inspect(commandName));
  }
}

// main([Array argv])
function main(argv) {
  var self = Program.sharedProgram = this;
  if (typeof argv === 'function') {
    modifier = argv;
    argv = undefined;
  }
  
  // avoid successive calls to main
  this.main = function(){ throw new Error('aready started'); }
  this.emit("start");
  
  // add commands
  if (Object.keys(this.cmd).length === 0) {
    this.cmd = false;
  } else if (this.cmd) {
    if (!this.cmd.help)
      this.cmd.help = exports.cmd_help;
    this.options.push('Commands:');
    var names = Object.keys(this.cmd);
    var commands = {};
    var aliases = {};
    for (var i=0; i<names.length; i++) {
      var alias = names[i];
      var command = this.cmd[alias];
      var found = false;
      for (var name in commands) {
        var c = commands[name];
        if (c === command) {
          if (c.alias === undefined) c.alias = [alias];
          else c.alias.push(alias);
          found = true;
          break;
        }
      }
      if (!found)
        commands[alias] = command;
    }
    //sys.debug('aliases -> '+sys.inspect(aliases));
    names = Object.keys(commands);
    var maxlen = names.reduce(function(pv, cv, i, ary){
      return Math.max(pv, cv.length);
    },15/* minimum width */);
    for (var i=0; i<names.length; i++) {
      var name = names[i], command, dname;
      command = commands[name];
      dname = name;
      if (command.alias && Array.isArray(command.alias) && command.alias && command.alias.length)
        dname += ', '+command.alias.join(', ');
      this.options.push('  '+dname.fillRight(maxlen)+'  '+
        (command.desc || ''));
    };
  }
  
  // parse options, replacing this.options
  if (!argv) argv = Array.prototype.slice.call(process.argv);
  this.options = optparse.options(argv, this.options, function(){
    this.stop_on(Object.keys(self.cmd));
  });
  this.optionParser = optparse.p;
  this.emit("options");
  
  // strip away ["node", "path/to/mode"]
  argv = argv.slice(2);
  
  // continue with command
  if (this.cmd) {
    // no command?
    if (!argv.length) { this.optionParser.educate(); this.exit(1); }
    
    // run command
    var commandName = argv.shift().toLowerCase();
    var command = self.getCommand(argv, commandName);
    
    // commands can use this to run subcommands
    self.runCommand = function runCommand(commandName, _argv, argsToMain) {
      var command = self.getCommand(_argv || argv, commandName);
      self.emit("command", command);
      command.main.apply(command, Array.isArray(argsToMain) ? argsToMain : []);
    };
    
    if (!command) {
      // Find closest match by prefix1 and edit distance
      var suggestedCommand = Object.keys(this.cmd).filter(function(a) {
        return a[0] === commandName[0]
      }).sort(function (a, b) {
        return a.editDistance(commandName) > b.editDistance(commandName);
      });
      if (suggestedCommand.length) {
        self.exit('Unknown command '+JSON.stringify(commandName)+' -- did you mean "'+suggestedCommand[0]+'"?');
      } else {
        self.optionParser.educate('Unknown command '+JSON.stringify(commandName));
        self.exit(1);
      }
    } else {
      // execute command
      self.emit("command", command);
      command.main.call(command, argv, command.parsedOptions || {});
    }
  }
}

Program.prototype.main = main;

})();



