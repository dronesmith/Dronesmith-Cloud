/**
 * Dronesmith Cloud
 *
 * Principle Engineer: Geoff Gardner <geoff@dronesmith.io>
 *
 * Copyright (C) 2016 Dronesmith Technologies Inc, all rights reserved.
 * Unauthorized copying of any source code or assets within this project, via
 * any medium is strictly prohibited.
 *
 * Proprietary and confidential.
 */

'use strict';

// Drone Data Protocol.

var crypto = require('crypto');
var crc = require('crc');

// Crypto information
var useCrypto = false;
var SECURE_ALGO = 'aes-256-ctr';

// Message opcodes
exports.OP_STATUS = 0x10;
exports.OP_CODE = 0x11;
exports.OP_MAVLINK_TEXT = 0xFD;
exports.OP_MAVLINK_BIN = 0xFE;

exports.useEncryption = function (use) {
  useCrypto = !!use;
};

exports.generateMsg = function (type, session, data) {
  var sendBuff, payload, crcVal;
  switch (type) {
    case exports.OP_MAVLINK_BIN: // MAVLink
      // binary MAVLink
      break;
    case exports.OP_MAVLINK_TEXT: // MAVLink
    case exports.OP_STATUS: // system status
      payload = JSON.stringify(data);
      break;

    case exports.OP_CODE:
      // TODO
      payload = data;
      break;

    default:
      throw Error('Invalid opcode');
  }

  sendBuff = new Buffer(9 + payload.length);
  sendBuff.writeUInt32BE(session, 0);
  sendBuff.writeUInt8(type, 4);
  sendBuff.writeUInt16BE(payload.length, 5);
  sendBuff.write(payload, 7);

  crcVal = crc.crc16(sendBuff.slice(0, 7 + payload.length));
  sendBuff.writeUInt16BE(crcVal, 7 + payload.length);

    return sendBuff;
};

exports.parseMessage = function (buffer) {
  var decoded;

    decoded = buffer;

  var crcVal = crc.crc16(decoded.slice(0, decoded.length - 2));
  var crcBuff = decoded.readUInt16BE(decoded.length - 2);

  if (crcVal !== crcBuff) {
    return {error: 'Checksum error'};
  }

  var session = decoded.readUInt32BE(0);
  var op = decoded.readUInt8(4);
  var len = decoded.readUInt16BE(5);
  var data = {};

  switch (op) {
    case exports.OP_MAVLINK_BIN:
      data = Buffer.from(decoded.slice(7, len + 7));
      break;

    case exports.OP_STATUS: // json
    case exports.OP_MAVLINK_TEXT: // same for json mavlink
      try {
        data = JSON.parse(decoded.toString('utf8', 7, len + 7));
      } catch (e) {
        throw Error('Invalid format');
      }
      break;

    case exports.OP_CODE:
      data = decoded.toString('utf8', 7, len + 7);
      break;

    default:
      throw Error('Invalid opcode');
  }

  return {type: op, session: session, data: data};
};
