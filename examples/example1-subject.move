import fs

// Produces an array of arguments received
export ping = ^{ Array.prototype.slice.call(arguments) }

// Get text content of file at `path`
export read = ^(path){
  fs.readFileSync! path, 'utf8'
}

// Get text content of this file
export source = ^{ read! __filename }

// Get lines in file at `path` as an array
readLines = ^(path) {
  read(path).split! /\n/
}
export readLines;
