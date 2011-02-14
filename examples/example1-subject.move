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

// There's only one kind of equality operator (the one without type coercion)
                    // Move    JavaScript
'' == '0'           // false   false
0 == ''             // false   true
0 == '0'            // false   true
false == 'false'    // false   false
false == '0'        // false   true
false == undefined  // false   false
false == null       // false   false
null == undefined   // false   true
' \t\r\n ' == 0     // false   true
