#!/usr/bin/env node
/**
 * Minimal packet capture test - does cap work at all?
 */
import Cap from 'cap'

const devices = Cap.Cap.deviceList()
console.log('Devices:', devices.length)

// Find Realtek
const dev = devices.find(d => d.description && d.description.includes('Realtek'))
if (!dev) { console.log('No Realtek found'); process.exit(1) }
console.log('Using:', dev.description, dev.name)

const cap = new Cap.Cap()
const buf = Buffer.alloc(65535)

// First test: capture ANY UDP on port 5056 (Albion)
const filter = 'udp port 5056'
console.log('Filter:', filter)

const linkType = cap.open(dev.name, filter, 65535, buf)
console.log('Link type:', linkType)
console.log('Waiting for packets... (play the game and browse market)')

let count = 0
cap.on('packet', (nbytes) => {
  count++
  const raw = buf.subarray(0, nbytes)
  // Parse ethernet
  const ethType = raw.readUInt16BE(12)
  const ipProto = raw[23]
  const srcIP = `${raw[26]}.${raw[27]}.${raw[28]}.${raw[29]}`
  const dstIP = `${raw[30]}.${raw[31]}.${raw[32]}.${raw[33]}`
  const srcPort = raw.readUInt16BE(34)
  const dstPort = raw.readUInt16BE(36)
  const udpLen = raw.readUInt16BE(38)

  console.log(`[${count}] ${nbytes}B | ${srcIP}:${srcPort} → ${dstIP}:${dstPort} | UDP len=${udpLen}`)

  // Show first 40 bytes of UDP payload
  const payload = raw.subarray(42, Math.min(82, nbytes))
  console.log('  Payload:', payload.toString('hex').match(/.{2}/g)?.join(' '))
})

// Also try broader filter after 10 seconds if nothing captured
setTimeout(() => {
  if (count === 0) {
    console.log('\n=== No packets on port 5056 after 10s ===')
    console.log('Trying broader filter: udp and host 193.169.238.141')
    cap.close()

    const cap2 = new Cap.Cap()
    const buf2 = Buffer.alloc(65535)
    const filter2 = 'udp and host 193.169.238.141'
    cap2.open(dev.name, filter2, 65535, buf2)
    console.log('Filter2:', filter2)

    cap2.on('packet', (nbytes) => {
      count++
      const raw = buf2.subarray(0, nbytes)
      const srcIP = `${raw[26]}.${raw[27]}.${raw[28]}.${raw[29]}`
      const dstIP = `${raw[30]}.${raw[31]}.${raw[32]}.${raw[33]}`
      const srcPort = raw.readUInt16BE(34)
      const dstPort = raw.readUInt16BE(36)
      console.log(`[${count}] ${nbytes}B | ${srcIP}:${srcPort} → ${dstIP}:${dstPort}`)
    })

    setTimeout(() => {
      if (count === 0) {
        console.log('\n=== Still no packets. Trying ALL udp ===')
        cap2.close()

        const cap3 = new Cap.Cap()
        const buf3 = Buffer.alloc(65535)
        cap3.open(dev.name, 'udp', 65535, buf3)
        let c3 = 0
        cap3.on('packet', (nbytes) => {
          c3++
          const raw = buf3.subarray(0, nbytes)
          const srcPort = raw.readUInt16BE(34)
          const dstPort = raw.readUInt16BE(36)
          if (c3 <= 5) console.log(`[udp ${c3}] ports ${srcPort} → ${dstPort}`)
          if (c3 === 5) { console.log('... UDP capture works. Port 5056 filter issue.'); cap3.close(); process.exit(0) }
        })

        setTimeout(() => {
          console.log(`Total UDP after 5s: ${c3}`)
          process.exit(0)
        }, 5000)
      } else {
        console.log(`Got ${count} packets with host filter`)
        process.exit(0)
      }
    }, 10000)
  }
}, 10000)

setTimeout(() => {
  console.log(`\nTotal: ${count} packets`)
  process.exit(0)
}, 35000)
