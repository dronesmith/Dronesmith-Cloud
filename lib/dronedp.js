'use strict';

// Drone Data Protocol.

var
  crypto = require('crypto'),
  crc = require('crc'),

  // Crypto information
  useCrypto = true,
  SECURE_ALGO = 'aes-256-ctr',

  // TODO move this to the config and set it up to autogenerate upon a new server build.
  // Generate by Node's crypto randombytes routine.
  SECURE_KEY = new Buffer(
    'd7 e6 af 0b 14 90 7e a5 0a fd e8 bb 57 4f 3d 99 81 88 d9 f5 1b 90 7d 3d 44 e7 94 e3 30 f0 55 d9'
      .split(' ').map(function(x){return parseInt(x, 16)}), 'binary');

// Message opcodes
exports.OP_STATUS =         0x10;
exports.OP_MAVLINK_TEXT =   0xFD;
exports.OP_MAVLINK_BIN =    0xFE;

exports.useEncryption = function(use) {
  useCrypto = !!use;
};

exports.generateMsg = function(type, session, data) {
  var sendBuff;
  switch (type) {
    case exports.OP_MAVLINK_BIN: // MAVLink
      // binary MAVLink
      break;
    case exports.OP_MAVLINK_TEXT: // MAVLink
    case exports.OP_STATUS: // system status
      var payload = JSON.stringify(data);
      sendBuff = new Buffer(9 + payload.length);
      sendBuff.write(session, 0, 4, 'hex');
      sendBuff.writeUInt8(type, 4);
      sendBuff.writeUInt16BE(payload.length, 5);
      sendBuff.write(payload, 7);

      var crcVal = crc.crc16(sendBuff.slice(0, 7 + payload.length));
      sendBuff.writeUInt16BE(crcVal, 7 + payload.length);
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

  var session = decoded.toString('hex', 0, 4);
  var op = decoded.readUInt8(4);
  var len = decoded.readUInt16BE(5);
  var data = {};

  switch (op) {
    case exports.OP_STATUS: // json
    case exports.OP_MAVLINK_TEXT: // same for json mavlink
      try {
        data = JSON.parse(decoded.toString('utf8', 7, len+7));
      } catch (e) {
        return {error: 'Invalid format'};
      }
      break;
    default:
      return {error: 'Invalid opcode'};
  }

  return {session: session, data: data};

};
