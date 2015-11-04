'use strict';

var
  assert = require('assert'),

  // Constants
  HEADER_BYTE1 = 0xA3,
  HEADER_BYTE2 = 0x95,
  FORMAT_MSG  = 0x80,


  // Format table is built out dynamically by the the logger
  formatTable = {},


  //
  // Functions
  //

  removeNull = function(str) {
    var newstr = '';
    for (var i = 0; i < str.length; ++i) {
      var val = str[i];
      if (val != '\0') {
        newstr += val;
      } else {
        return newstr || '';
      }
    }
  },

  decode = function(format, data, offset) {
    var message = {
      message: format.type,
      payload: {}
    };

    var j = offset;

    for (var i = 0; i < format.format.length; ++i) {
      switch (format.format[i]) {
        case 'b': message.payload[format.labels[i]] = data.readInt8(j++); break;
        case 'M':
        case 'B': message.payload[format.labels[i]] = data.readUInt8(j++); break;
        case 'h': message.payload[format.labels[i]] = data.readInt16BE(j); j+=2; break;
        case 'H': message.payload[format.labels[i]] = data.readUInt16BE(j); j+=2; break;
        case 'L':
        case 'i': message.payload[format.labels[i]] = data.readInt32BE(j); j+=4; break;
        case 'I': message.payload[format.labels[i]] = data.readUInt32BE(j); j+=4; break;
        case 'f': message.payload[format.labels[i]] = data.readFloatBE(j); j+=4; break;

        case 'q':
          var num = data.readInt32BE(j);
          j+=4;
          var num2 = data.readInt32BE(j);
          j+=4;
          var quad = (num2 << 32) | num;
          message.payload[format.labels[i]] = quad;
          break;

        case 'Q':
          var num = data.readUInt32BE(j);
          j+=4;
          var num2 = data.readUInt32BE(j);
          j+=4;
          var quad = (num2 << 32) | num;
          message.payload[format.labels[i]] = quad;
          break;

        case 'c':
          message.payload[format.labels[i]] = data.readIntBE(j, 200);
          j += 200;
          break;

        case 'C':
          message.payload[format.labels[i]] = data.readUIntBE(j, 200);
          j += 200;
          break;

        case 'e':
          message.payload[format.labels[i]] = data.readIntBE(j, 400);
          j += 400;
          break;

        case 'E':
          message.payload[format.labels[i]] = data.readUIntBE(j, 400);
          j += 400;
          break;

        default: console.log("WARN: Unknown decode type: ", format.format[i]); break;
      }
    }

    return message;
  }
;

exports.parse = function(buffer) {

  var iter = 0, processed = [];

  // console.log(buffer);

  while (iter < buffer.length) {

    //
    // XXX
    // javascript/node cannot decode binary files properly.
    // So we need to check for valid opcodes here, since javascript often
    // prefixes random 0xC3's and 0xC2's whenever it feels like it.
    //
    // I assume this is a `feature.`
    //

    // get headers
    try {
      while (buffer.readUInt8(iter++) != HEADER_BYTE1) ;
      while (buffer.readUInt8(iter++) != HEADER_BYTE2) ;

      var op;

      do {
        op = buffer.readUInt8(iter++);
      } while (op != FORMAT_MSG && !formatTable.hasOwnProperty(op)) ;

      if (op == FORMAT_MSG) {
        var format = {
          type:     buffer.readUInt8(iter++),
          length:   buffer.readUInt8(iter++),
          name:     buffer.toString('ascii', iter, iter+4),
          format:   removeNull(buffer.toString('ascii', iter+4, iter+20)).split(""),
          labels:   removeNull(buffer.toString('ascii', iter+20, iter+84)).split(",")
        };
        iter += 84;
        // console.log(format);
        formatTable[format.type] = format;
      } else if (formatTable.hasOwnProperty(op)) {
        format = formatTable[op];

        // console.log('===========================================================');
        // console.log(format);
        // console.log(decode(format, buffer, iter));
        // console.log('===========================================================');

        processed.push(decode(format, buffer, iter));
        iter += format.length;
      } else {
        console.log(op);
        throw new Error("Invalid type: ", op);
      }
    } catch (e) {
      console.log(e);
    }
  }
  // console.log(processed);
  return processed;
};

// require('fs').readFile('samplelog.bin', 'binary', function(err, data) {
//   if (err) throw err;
//   var processed = exports.parse(new Buffer(data));
//   require('fs').writeFile('samplelog.json', JSON.stringify(processed), function(err) {
//     if (err) throw err;
//   });
// });
