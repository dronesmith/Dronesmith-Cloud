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

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String,
    required: true
  },

  icon: {
    type: String,
    required: true
  },

  index: {
    type: String,
    required: true
  },

  controller: {
    type: String,
    required: true
  },

  // Data that is synced when mod is active in real time
  modSync: {
    type: Schema.Types.Mixed
  },

  // Data that can be saved or loaded from Mod on demand by the user.
  modData: {
    type: Schema.Types.Mixed
  }
});

module.exports = mongoose.model('Mod', this.schema);
