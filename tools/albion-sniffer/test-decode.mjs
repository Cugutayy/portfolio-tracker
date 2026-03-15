#!/usr/bin/env node
/**
 * Decode test - capture packets and show ALL decoded messages with details
 */
import Cap from 'cap'
import { parsePhotonPacket, processCommand, MSG_OPERATION_REQUEST, MSG_OPERATION_RESPONSE, MSG_EVENT_DATA } from './photon.mjs'

const devices = Cap.Cap.deviceList()
const dev = devices.find(d => d.description && d.description.includes('Realtek'))
if (!dev) { console.log('No Realtek found'); process.exit(1) }

const cap = new Cap.Cap()
const buf = Buffer.alloc(65535)
const linkType = cap.open(dev.name, 'udp port 5056', 65535, buf)
console.log('Capturing on', dev.description, '| Link:', linkType)
console.log('Browse the market in game...\n')

const typeCounts = { req: 0, resp: 0, evt: 0, other: 0, encrypted: 0, fragPending: 0 }
const opCounts = {}
let pktCount = 0

cap.on('packet', (nbytes) => {
  pktCount++
  const raw = buf.subarray(0, nbytes)

  // Parse ethernet + IP + UDP
  let offset = 14 // ethernet
  const ipHeaderLen = (raw[offset] & 0x0F) * 4
  offset += ipHeaderLen
  const srcPort = raw.readUInt16BE(offset)
  const dstPort = raw.readUInt16BE(offset + 2)
  offset += 8

  const udpPayloadLen = raw.readUInt16BE(offset - 6) - 8
  if (udpPayloadLen <= 0) return
  const payload = Buffer.from(raw.subarray(offset, offset + udpPayloadLen))

  const isFromServer = srcPort === 5056

  const packet = parsePhotonPacket(payload)
  if (!packet) return

  for (const cmd of packet.commands) {
    // Log command types
    if (cmd.type === 8) {
      typeCounts.fragPending++
    }

    const msg = processCommand(cmd)
    if (!msg) {
      // Check if encrypted
      if (cmd.type === 6 || cmd.type === 7) {
        if (cmd.data.length >= 2) {
          const mType = cmd.data.length >= 2 ? cmd.data[cmd.type === 7 ? 5 : 1] : 0
          if (mType > 128) typeCounts.encrypted++
        }
      }
      continue
    }

    const dir = isFromServer ? '←' : '→'
    const typeStr = msg.type === MSG_OPERATION_RESPONSE ? 'RESP'
      : msg.type === MSG_OPERATION_REQUEST ? 'REQ'
      : msg.type === MSG_EVENT_DATA ? 'EVT'
      : `T${msg.type}`

    if (msg.type === MSG_OPERATION_RESPONSE) typeCounts.resp++
    else if (msg.type === MSG_OPERATION_REQUEST) typeCounts.req++
    else if (msg.type === MSG_EVENT_DATA) typeCounts.evt++
    else typeCounts.other++

    const code = msg.operationCode || msg.eventCode
    opCounts[`${typeStr}:${code}`] = (opCounts[`${typeStr}:${code}`] || 0) + 1

    // Log interesting messages (not the flood of EVT op=3)
    if (typeStr !== 'EVT' || code !== 3) {
      const paramKeys = Object.keys(msg.params)
      console.log(`${dir} ${typeStr} op=${code} params=[${paramKeys.join(',')}]`)

      // For market ops, show param 0 detail
      if (code === 75 || code === 76) {
        const p0 = msg.params[0]
        console.log(`  param[0] type=${typeof p0} isArray=${Array.isArray(p0)} len=${Array.isArray(p0) ? p0.length : '?'}`)
        if (Array.isArray(p0) && p0.length > 0) {
          console.log(`  first entry:`, typeof p0[0] === 'string' ? p0[0].substring(0, 200) : p0[0])
        }
      }

      // For REQ/RESP, show param values briefly
      if (paramKeys.length <= 10 && typeStr !== 'EVT') {
        for (const k of paramKeys) {
          const v = msg.params[k]
          const vStr = typeof v === 'string' ? `"${v.substring(0, 80)}"` : JSON.stringify(v)?.substring(0, 100) || String(v)
          console.log(`  [${k}] = ${vStr}`)
        }
      }
    }
  }
})

// Print summary periodically
setInterval(() => {
  console.log(`\n=== ${pktCount} pkts | REQ:${typeCounts.req} RESP:${typeCounts.resp} EVT:${typeCounts.evt} ENC:${typeCounts.encrypted} FRAG:${typeCounts.fragPending} ===`)
  const sorted = Object.entries(opCounts).sort((a, b) => b[1] - a[1])
  for (const [k, v] of sorted.slice(0, 15)) {
    console.log(`  ${k}: ${v}`)
  }
  console.log()
}, 10000)

setTimeout(() => {
  console.log('\n=== FINAL SUMMARY ===')
  console.log(`Packets: ${pktCount}`)
  console.log(`Types:`, typeCounts)
  console.log(`Op codes:`, opCounts)
  process.exit(0)
}, 60000)
