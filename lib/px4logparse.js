const
  fs = require('fs'),

  usage = () => console.log("px4logparse /dir/filename.px4log"),
  die = (e) => {
    console.log(e)
    process.exit(1)
  },


  HEADER_LEN = 3,
  MSG_HEAD1 = 0xA3,
  MSG_HEAD2 = 0x95,
  MSG_FORMAT_PACKET_LEN = 89,
  MSG_TYPE_FORMAT = 0x80
  ;

let
  buff,
  iter = 0
  ;

if (process.argv.length < 3) {
  usage();
  process.exit(1);
}

try {
  buff = fs.readFileSync(process.argv[2]);

  // length check
  if (buff.length < HEADER_LEN) {
    throw new Error("File too small");
  }

  // header check
  if (buff.readUInt8(iter++) !== MSG_HEAD1 || buff.readUInt8(iter++) !== MSG_HEAD2) {
    throw new Error("Invalid HEADER");
  }

  let
    cnt = 0,
    fmtTable = {},
    state = -1,
    messages = []
    ;

  // Parse everything
  while (iter < buff.length) {
    const op = buff.readUInt8(iter);
    if (op === MSG_TYPE_FORMAT) {
      const type = buff.readUInt8(iter+1);

      if (type != MSG_TYPE_FORMAT) {
        const
          length = buff.readUInt8(iter+2),
          name = buff.toString('ascii', iter+3, iter+7).replace(/\0/g, ''),
          fields = buff.toString('ascii', iter+7, iter+23).replace(/\0/g, '').split(''),
          labels = buff.toString('ascii', iter+23, iter+87).replace(/\0/g, '').split(',')
          ;

        fmtTable[type] = {
          length, name, fields, labels
        };
        // console.log('==========================================================');
        // console.log(type, length, name, field, label);
        // console.log('==========================================================');
        // if (cnt++ > 61) {
        //   break;
        // }
      }
      iter += MSG_FORMAT_PACKET_LEN
    } else if (fmtTable.hasOwnProperty(op)) {
      const format = fmtTable[op];
      let
        payload = {},
        labelIndex = 0,
        buffIndex = iter+1;
        ;

      format.fields.forEach((field) => {
        switch (field) {
          // 8 Bit Int
          case 'b': payload[format.labels[labelIndex]] = buff.readInt8(buffIndex++); break;
          case 'M': // same as B
          case 'B': payload[format.labels[labelIndex]] = buff.readUInt8(buffIndex++); break;

          // 16 Bit Int
          case 'c':
          case 'h': payload[format.labels[labelIndex]] = buff.readInt16LE(buffIndex); buffIndex+=2; break;
          case 'C':
          case 'H': payload[format.labels[labelIndex]] = buff.readUInt16LE(buffIndex); buffIndex+=2; break;

          // 32 Bit Int
          case 'e':
          case 'L':
          case 'i': payload[format.labels[labelIndex]] = buff.readInt32LE(buffIndex); buffIndex+=4; break;
          case 'E':
          case 'I': payload[format.labels[labelIndex]] = buff.readUInt32LE(buffIndex); buffIndex+=4; break;

          // Floats
          case 'f': payload[format.labels[labelIndex]] = buff.readFloatLE(buffIndex); buffIndex+=4; break;

          // Skip 64 bit datatypes for now
          case 'd':
          case 'Q':
          case 'q': buffIndex+=8; break;

          // Strings
          case 'n': payload[format.labels[labelIndex]] = buff.toString('ascii', buffIndex, buffIndex+4); buffIndex+=4; break;
          case 'N': payload[format.labels[labelIndex]] = buff.toString('ascii', buffIndex, buffIndex+16); buffIndex+=16; break;
          case 'Z': payload[format.labels[labelIndex]] = buff.toString('ascii', buffIndex, buffIndex+64); buffIndex+=64; break;
        }
        labelIndex++;
      });

      // We care about RC messages
      if (format.name === 'RC') {
        messages.push({name: 'RC', payload: payload});

        // console.log("=[RC Values]=============================================");
        // console.log('Roll:', payload['C0']);
        // console.log('Pitch:', payload['C1']);
        // console.log('Throttle:', payload['C2']);
        // console.log('Yaw:', payload['C3']);
        // console.log("=========================================================");
      } else if (format.name === 'STAT') {
        messages.push({name: 'STAT', payload: payload});
        // if (state !== payload['MainState']) {
        //   let str = 'MAIN STATE TRANSISTION: ';
        //   state = payload['MainState'];
        //
        //   switch (state) {
        //   case 0: str += 'MANUAL'; break;
        //   case 1: str += 'ALT HOLD'; break;
        //   case 2: str += 'POS HOLD'; break;
        //   default: str += 'UNKNOWN'; break;
        //   }
        //
        //   console.log(str);
        // }
        // console.log("=[STAT Values]===========================================");
        // console.log('Main State:', payload['MainState']);
        // console.log('Nav State:', payload['NavState']);
        // console.log('Arming State:', payload['ArmS']);
        // console.log('Failsafe Mode:', payload['Failsafe']);
        // console.log("=========================================================");
      }

      // console.log(format.name, format.fields, payload);
      iter += format.length;
    } else {
      iter++;
    }
  }

  // console.log(fmtTable);

  console.log('replaying.');
  let counter = 0;
  setInterval(() => {
    if (counter >= messages.length) {
      return;
    }

    let msg = messages[counter++];

    if (msg.name === 'RC') {

      // console.log("=[RC Values]=============================================");
      // console.log('Roll:', payload['C0']);
      // console.log('Pitch:', payload['C1']);
      // console.log('Throttle:', payload['C2']);
      // console.log('Yaw:', payload['C3']);
      // console.log("=========================================================");
    } else if (msg.name === 'STAT') {
      if (state !== msg.payload['MainState']) {
        let str = 'MAIN STATE TRANSISTION: ';
        state = msg.payload['MainState'];

        switch (state) {
        case 0: str += 'MANUAL'; break;
        case 1: str += 'ALT HOLD'; break;
        case 2: str += 'POS HOLD'; break;
        default: str += 'UNKNOWN'; break;
        }

        console.log(str);
      }
      // console.log("=[STAT Values]===========================================");
      // console.log('Main State:', payload['MainState']);
      // console.log('Nav State:', payload['NavState']);
      // console.log('Arming State:', payload['ArmS']);
      // console.log('Failsafe Mode:', payload['Failsafe']);
      // console.log("=========================================================");
    }
  }, 100);

  console.log('done.');

} catch (e) {
  die(e);
}
