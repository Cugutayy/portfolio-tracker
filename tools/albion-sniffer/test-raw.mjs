#!/usr/bin/env node
/**
 * Raw packet analysis - see what command types exist in Photon packets
 */
import Cap from 'cap'
import { parsePhotonPacket } from './photon.mjs'

const devices = Cap.Cap.deviceList()
const dev = devices.find(d => d.description && d.description.includes('Realtek'))
if (!dev) { console.log('No Realtek found'); process.exit(1) }

const cap = new Cap.Cap()
const buf = Buffer.alloc(65535)
cap.open(dev.name, 'udp port 5056', 65535, buf)
console.log('Capturing...\n')

const cmdTypeCounts = {}
const msgTypeCounts = {}
let pktCount = 0

cap.on('packet', (nbytes) => {
  pktCount++
  const raw = buf.subarray(0, nbytes)

  let offset = 14 // ethernet
  const ipHeaderLen = (raw[offset] & 0x0F) * 4
  offset += ipHeaderLen
  const srcPort = raw.readUInt16BE(offset)
  offset += 8

  const udpLen = raw.readUInt16BE(offset - 6)
  const payloadLen = udpLen - 8
  if (payloadLen <= 0) return
  const payload = Buffer.from(raw.subarray(offset, offset + payloadLen))

  const isFromServer = srcPort === 5056

  // Parse Photon header manually to see ALL command types
  if (payload.length < 12) return
  const crcEnabled = payload.readUInt8(2)
  const commandCount = payload.readUInt8(3)

  let pOff = 12
  if (crcEnabled === 0xCC) pOff += 4

  for (let i = 0; i < commandCount; i++) {
    if (pOff + 12 > payload.length) break
    const cmdType = payload.readUInt8(pOff)
    const cmdLen = payload.readInt32BE(pOff + 4)

    cmdTypeCounts[cmdType] = (cmdTypeCounts[cmdType] || 0) + 1

    // For reliable/unreliable commands, peek at the message type
    if (cmdType === 6 && cmdLen > 12 + 2) {
      // Reliable: data starts at pOff + 12
      const msgType = payload.readUInt8(pOff + 12 + 1)
      const key = `reliable:msgType=${msgType}`
      msgTypeCounts[key] = (msgTypeCounts[key] || 0) + 1

      // If it's a response (type 3 or 7), show op code
      if (msgType === 3 || msgType === 7) {
        const opCode = payload.readUInt8(pOff + 12 + 2)
        const rKey = `RESP:op=${opCode}`
        msgTypeCounts[rKey] = (msgTypeCounts[rKey] || 0) + 1
        if (pktCount <= 500) {
          const dir = isFromServer ? '←' : '→'
          console.log(`${dir} RESP msgType=${msgType} op=${opCode} cmdLen=${cmdLen}`)
        }
      }
      if (msgType === 2) {
        const opCode = payload.readUInt8(pOff + 12 + 2)
        const rKey = `REQ:op=${opCode}`
        msgTypeCounts[rKey] = (msgTypeCounts[rKey] || 0) + 1
        if (pktCount <= 500) {
          const dir = isFromServer ? '←' : '→'
          console.log(`${dir} REQ msgType=${msgType} op=${opCode} cmdLen=${cmdLen}`)
        }
      }
      // Check for encrypted
      if (msgType > 128) {
        const eKey = `encrypted:${msgType}`
        msgTypeCounts[eKey] = (msgTypeCounts[eKey] || 0) + 1
      }
    }

    if (cmdType === 7 && cmdLen > 12 + 4 + 2) {
      // Unreliable: skip 4 byte header then message
      const msgType = payload.readUInt8(pOff + 12 + 4 + 1)
      const key = `unreliable:msgType=${msgType}`
      msgTypeCounts[key] = (msgTypeCounts[key] || 0) + 1
    }

    if (cmdType === 8 && cmdLen > 12) {
      // Fragment
      msgTypeCounts['fragment'] = (msgTypeCounts['fragment'] || 0) + 1
    }

    if (cmdLen < 12) break
    pOff += cmdLen
  }
})

setInterval(() => {
  console.log(`\n--- ${pktCount} pkts ---`)
  console.log('CMD types:', cmdTypeCounts)
  console.log('MSG types:', msgTypeCounts)
}, 10000)

setTimeout(() => process.exit(0), 35000)
