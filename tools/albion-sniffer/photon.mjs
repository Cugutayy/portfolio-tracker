/**
 * Photon Engine Protocol Decoder for Albion Online
 *
 * Decodes UDP packets from the Photon networking engine used by Albion.
 * Based on: https://github.com/ao-data/photon-spectator
 *
 * Packet structure:
 *   PhotonHeader (12 bytes) → Commands[] → ReliableMessage → Parameters
 */

// --- Photon Command Types ---
const CMD_ACKNOWLEDGE = 1
const CMD_CONNECT = 2
const CMD_VERIFY_CONNECT = 3
const CMD_DISCONNECT = 4
const CMD_PING = 5
const CMD_SEND_RELIABLE = 6
const CMD_SEND_UNRELIABLE = 7
const CMD_SEND_FRAGMENT = 8

// --- Message Types ---
const MSG_OPERATION_REQUEST = 2
const MSG_EVENT_DATA = 4
const MSG_OPERATION_RESPONSE = 7

// --- Parameter Type Codes ---
const TYPE_NIL = 42        // 0x2A
const TYPE_DICT = 68       // 0x44 'D'
const TYPE_STRING_ARR = 97 // 0x61 'a'
const TYPE_INT8 = 98       // 0x62 'b'
const TYPE_CUSTOM = 99     // 0x63 'c'
const TYPE_DOUBLE = 100    // 0x64 'd'
const TYPE_FLOAT = 102     // 0x66 'f'
const TYPE_HASHTABLE = 104 // 0x68 'h'
const TYPE_INT32 = 105     // 0x69 'i'
const TYPE_INT16 = 107     // 0x6B 'k'
const TYPE_INT64 = 108     // 0x6C 'l'
const TYPE_INT32_ARR = 110 // 0x6E 'n'
const TYPE_BOOL = 111      // 0x6F 'o'
const TYPE_STRING = 115    // 0x73 's'
const TYPE_INT8_ARR = 120  // 0x78 'x'
const TYPE_SLICE = 121     // 0x79 'y'
const TYPE_OBJ_ARR = 122   // 0x7A 'z'

// CMD header size
const CMD_HEADER_SIZE = 12

/**
 * Fragment reassembly store
 * Key: `${startSeqNum}` → { totalLength, fragments: Map<fragmentOffset, Buffer> }
 */
const fragmentStore = new Map()

/**
 * Parse a Photon packet from raw UDP payload
 * @param {Buffer} buf - Raw UDP payload
 * @returns {{ peerId: number, commands: PhotonCommand[] } | null}
 */
export function parsePhotonPacket(buf) {
  if (buf.length < 12) return null

  const peerId = buf.readUInt16BE(0)
  const crcEnabled = buf.readUInt8(2)
  const commandCount = buf.readUInt8(3)
  // const timestamp = buf.readUInt32BE(4)
  // const challenge = buf.readInt32BE(8)

  let offset = 12
  // If CRC is enabled, skip 4 bytes of CRC
  if (crcEnabled === 0xCC) {
    offset += 4
  }

  const commands = []
  for (let i = 0; i < commandCount; i++) {
    if (offset + CMD_HEADER_SIZE > buf.length) break

    const type = buf.readUInt8(offset)
    const channelId = buf.readUInt8(offset + 1)
    // const flags = buf.readUInt8(offset + 2)
    // const reservedByte = buf.readUInt8(offset + 3)
    const length = buf.readInt32BE(offset + 4)
    const reliableSeqNum = buf.readInt32BE(offset + 8)

    if (length < CMD_HEADER_SIZE || offset + length > buf.length) break

    const data = buf.subarray(offset + CMD_HEADER_SIZE, offset + length)
    commands.push({ type, channelId, reliableSeqNum, length, data })
    offset += length
  }

  return { peerId, commands }
}

/**
 * Process a photon command and extract reliable messages
 * @param {{ type: number, data: Buffer, reliableSeqNum: number }} cmd
 * @returns {ReliableMessage | null}
 */
export function processCommand(cmd) {
  switch (cmd.type) {
    case CMD_SEND_RELIABLE:
      return decodeReliableMessage(cmd.data)

    case CMD_SEND_UNRELIABLE:
      // Strip 4-byte unreliable header
      if (cmd.data.length < 4) return null
      return decodeReliableMessage(cmd.data.subarray(4))

    case CMD_SEND_FRAGMENT:
      return handleFragment(cmd)

    default:
      return null
  }
}

/**
 * Handle fragmented reliable messages
 */
function handleFragment(cmd) {
  if (cmd.data.length < 20) return null

  const startSeqNum = cmd.data.readInt32BE(0)
  const fragmentCount = cmd.data.readInt32BE(4)
  const fragmentNum = cmd.data.readInt32BE(8)
  const totalLength = cmd.data.readInt32BE(12)
  const fragmentOffset = cmd.data.readInt32BE(16)
  const fragmentData = cmd.data.subarray(20)

  const key = `${startSeqNum}`
  if (!fragmentStore.has(key)) {
    fragmentStore.set(key, {
      totalLength,
      fragmentCount,
      fragments: new Map()
    })
  }

  const entry = fragmentStore.get(key)
  entry.fragments.set(fragmentOffset, fragmentData)

  // Check if we have all fragments
  if (entry.fragments.size === entry.fragmentCount) {
    // Reassemble
    const assembled = Buffer.alloc(entry.totalLength)
    for (const [off, frag] of entry.fragments) {
      frag.copy(assembled, off)
    }
    fragmentStore.delete(key)

    // Clean up old fragments (older than 30 seconds worth)
    if (fragmentStore.size > 100) {
      const keys = [...fragmentStore.keys()]
      for (let i = 0; i < keys.length - 50; i++) {
        fragmentStore.delete(keys[i])
      }
    }

    return decodeReliableMessage(assembled)
  }

  return null
}

/**
 * Decode a reliable message from buffer
 * @param {Buffer} buf
 * @returns {ReliableMessage | null}
 */
function decodeReliableMessage(buf) {
  if (buf.length < 2) return null

  const signature = buf.readUInt8(0)
  let msgType = buf.readUInt8(1)

  // Encrypted packet check - if type > 128, packet is encrypted
  if (msgType > 128) return null

  // Convert old response type to new
  if (msgType === 3) msgType = MSG_OPERATION_RESPONSE

  let offset = 2
  let operationCode = 0
  let eventCode = 0

  if (msgType === MSG_OPERATION_REQUEST || msgType === MSG_OPERATION_RESPONSE) {
    if (offset >= buf.length) return null
    operationCode = buf.readUInt8(offset)
    offset++
  } else if (msgType === MSG_EVENT_DATA) {
    if (offset >= buf.length) return null
    eventCode = buf.readUInt8(offset)
    offset++
  } else {
    return null
  }

  // For responses, skip 2 bytes (return code + debug message)
  if (msgType === MSG_OPERATION_RESPONSE) {
    if (offset + 4 > buf.length) return null
    // returnCode (short) + debugMessage (?)
    const returnCode = buf.readInt16BE(offset)
    offset += 2
    // Read debug string or skip
    const debugResult = readValue(buf, offset, TYPE_STRING)
    if (debugResult) offset = debugResult.offset
    else offset += 0

    if (returnCode !== 0) {
      return null // Non-success response
    }
  }

  // Read parameter count
  if (offset + 2 > buf.length) return null
  const paramCount = buf.readInt16BE(offset)
  offset += 2

  // Decode parameters
  const params = {}
  for (let i = 0; i < paramCount; i++) {
    if (offset >= buf.length) break

    const paramId = buf.readUInt8(offset)
    offset++

    if (offset >= buf.length) break
    const typeCode = buf.readUInt8(offset)
    offset++

    const result = readValue(buf, offset, typeCode)
    if (!result) break

    params[paramId] = result.value
    offset = result.offset
  }

  return {
    type: msgType,
    operationCode,
    eventCode,
    params
  }
}

/**
 * Read a typed value from buffer
 * @param {Buffer} buf
 * @param {number} offset
 * @param {number} typeCode
 * @returns {{ value: any, offset: number } | null}
 */
function readValue(buf, offset, typeCode) {
  if (offset >= buf.length) return null

  switch (typeCode) {
    case TYPE_NIL:
      return { value: null, offset }

    case TYPE_BOOL:
      if (offset >= buf.length) return null
      return { value: buf.readUInt8(offset) !== 0, offset: offset + 1 }

    case TYPE_INT8:
      if (offset >= buf.length) return null
      return { value: buf.readInt8(offset), offset: offset + 1 }

    case TYPE_INT16:
      if (offset + 2 > buf.length) return null
      return { value: buf.readInt16BE(offset), offset: offset + 2 }

    case TYPE_INT32:
      if (offset + 4 > buf.length) return null
      return { value: buf.readInt32BE(offset), offset: offset + 4 }

    case TYPE_INT64: {
      if (offset + 8 > buf.length) return null
      const hi = buf.readInt32BE(offset)
      const lo = buf.readUInt32BE(offset + 4)
      return { value: hi * 0x100000000 + lo, offset: offset + 8 }
    }

    case TYPE_FLOAT:
      if (offset + 4 > buf.length) return null
      return { value: buf.readFloatBE(offset), offset: offset + 4 }

    case TYPE_DOUBLE:
      if (offset + 8 > buf.length) return null
      return { value: buf.readDoubleBE(offset), offset: offset + 8 }

    case TYPE_STRING: {
      if (offset + 2 > buf.length) return null
      const len = buf.readUInt16BE(offset)
      offset += 2
      if (offset + len > buf.length) return null
      const str = buf.toString('utf8', offset, offset + len)
      return { value: str, offset: offset + len }
    }

    case TYPE_INT8_ARR: {
      if (offset + 4 > buf.length) return null
      const len = buf.readInt32BE(offset)
      offset += 4
      if (offset + len > buf.length) return null
      const arr = Buffer.from(buf.subarray(offset, offset + len))
      return { value: arr, offset: offset + len }
    }

    case TYPE_INT32_ARR: {
      if (offset + 2 > buf.length) return null
      const len = buf.readInt16BE(offset)
      offset += 2
      const arr = []
      for (let i = 0; i < len; i++) {
        if (offset + 4 > buf.length) return null
        arr.push(buf.readInt32BE(offset))
        offset += 4
      }
      return { value: arr, offset }
    }

    case TYPE_STRING_ARR: {
      if (offset + 2 > buf.length) return null
      const len = buf.readInt16BE(offset)
      offset += 2
      const arr = []
      for (let i = 0; i < len; i++) {
        if (offset + 2 > buf.length) return null
        const sLen = buf.readUInt16BE(offset)
        offset += 2
        if (offset + sLen > buf.length) return null
        arr.push(buf.toString('utf8', offset, offset + sLen))
        offset += sLen
      }
      return { value: arr, offset }
    }

    case TYPE_OBJ_ARR: {
      if (offset + 2 > buf.length) return null
      const len = buf.readInt16BE(offset)
      offset += 2
      const arr = []
      for (let i = 0; i < len; i++) {
        if (offset >= buf.length) return null
        const elemType = buf.readUInt8(offset)
        offset++
        const result = readValue(buf, offset, elemType)
        if (!result) return null
        arr.push(result.value)
        offset = result.offset
      }
      return { value: arr, offset }
    }

    case TYPE_SLICE: {
      if (offset + 2 > buf.length) return null
      const len = buf.readInt16BE(offset)
      offset += 2
      if (offset >= buf.length) return null
      const elemType = buf.readUInt8(offset)
      offset++
      const arr = []
      for (let i = 0; i < len; i++) {
        const result = readValue(buf, offset, elemType)
        if (!result) return null
        arr.push(result.value)
        offset = result.offset
      }
      return { value: arr, offset }
    }

    case TYPE_DICT: {
      if (offset + 2 > buf.length) return null
      const keyType = buf.readUInt8(offset)
      const valType = buf.readUInt8(offset + 1)
      offset += 2
      if (offset + 2 > buf.length) return null
      const size = buf.readInt16BE(offset)
      offset += 2
      const dict = {}
      for (let i = 0; i < size; i++) {
        const kt = keyType === 0 || keyType === TYPE_NIL ? buf.readUInt8(offset++) : keyType
        const kResult = readValue(buf, offset, kt)
        if (!kResult) return null
        offset = kResult.offset

        const vt = valType === 0 || valType === TYPE_NIL ? buf.readUInt8(offset++) : valType
        const vResult = readValue(buf, offset, vt)
        if (!vResult) return null
        offset = vResult.offset

        dict[kResult.value] = vResult.value
      }
      return { value: dict, offset }
    }

    case TYPE_HASHTABLE: {
      if (offset + 2 > buf.length) return null
      const size = buf.readInt16BE(offset)
      offset += 2
      const dict = {}
      for (let i = 0; i < size; i++) {
        if (offset >= buf.length) return null
        const kt = buf.readUInt8(offset)
        offset++
        const kResult = readValue(buf, offset, kt)
        if (!kResult) return null
        offset = kResult.offset

        if (offset >= buf.length) return null
        const vt = buf.readUInt8(offset)
        offset++
        const vResult = readValue(buf, offset, vt)
        if (!vResult) return null
        offset = vResult.offset

        dict[kResult.value] = vResult.value
      }
      return { value: dict, offset }
    }

    case TYPE_CUSTOM: {
      // Skip custom types - read length and skip
      if (offset + 4 > buf.length) return null
      // Custom format: typeId (1 byte) + length (2 bytes) + data
      offset++ // skip custom type id
      if (offset + 2 > buf.length) return null
      const len = buf.readUInt16BE(offset)
      offset += 2
      return { value: null, offset: offset + len }
    }

    default:
      // Unknown type, can't continue
      return null
  }
}

export {
  MSG_OPERATION_REQUEST,
  MSG_OPERATION_RESPONSE,
  MSG_EVENT_DATA
}
