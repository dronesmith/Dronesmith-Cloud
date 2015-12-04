'use strict';

// Drone Data Protocol.

var
  crypto = require('crypto'),
  crc = require('crc'),

  OP_STATUS = 0x10,
  OP_MAVLINK_TEXT = 0xFD,
  OP_MAVLINK_BIN = 0xFE,

  useCrypto = true,
  SECURE_ALGO = 'aes-256-ctr',
  SECURE_KEY = new Buffer(
    'd7 e6 af 0b 14 90 7e a5 0a fd e8 bb 57 4f 3d 99 81 88 d9 f5 1b 90 7d 3d 44 e7 94 e3 30 f0 55 d9'
      .split(' ').map(function(x){return parseInt(x, 16)}), 'binary');

exports.useEncryption = function(use) {
  useCrypto = !!use;
};

exports.generateMsg = function(type, data) {
  var sendBuff;
  switch (type) {
    case OP_MAVLINK_TEXT: // MAVLink
      // parsed MAVLink message
      break;
    case OP_MAVLINK_BIN: // MAVLink
      // binary MAVLink
      break;
    case OP_STATUS: // system status
      var payload = JSON.stringify(data);
      sendBuff = new Buffer(5 + payload.length);
      sendBuff.writeUInt8(type, 0);
      sendBuff.writeUInt16BE(payload.length, 1);
      sendBuff.write(payload, 3);

      var crcVal = crc.crc16(sendBuff.slice(0, 3 + payload.length));
      sendBuff.writeUInt16BE(crcVal, 3 + payload.length);
      break;
    default:
      return {error: 'Invalid opcode'};
  }

  // encrypt
  if (useCrypto) {
    var cipher = crypto.createCipher(
      SECURE_ALGO,
      SECURE_KEY);

    var encryption = Buffer.concat([cipher.update(sendBuff), cipher.final()]);

    return encryption;
  } else {
    return sendBuff;
  }
};

exports.parseMessage = function(buffer) {
  var decoded;

  if (useCrypto) {
    var decipher = crypto.createDecipher(
      SECURE_ALGO,
      SECURE_KEY);
    decoded = Buffer.concat([decipher.update(buffer) , decipher.final()]);
  } else {
    decoded = buffer;
  }

  var crcVal = crc.crc16(decoded.slice(0,  decoded.length-2));
  var crcBuff = decoded.readUInt16BE(decoded.length-2);

  if (crcVal != crcBuff) {
    return {error: 'Checksum error'};
  }

  var op = decoded.readUInt8(0);
  var len = decoded.readUInt16BE(1);
  var data = null;

  switch (op) {
    case OP_STATUS: // json
      try {
        data = JSON.parse(decoded.toString('utf8', 3, len+3));
      } catch (e) {
        return {error: 'Invalid format'};
      }
      break;
    default:
      return {error: 'Invalid opcode'};
  }

  return data;

};
