/**
 * Updated WebRTC Connection Manager with hybrid signaling
 */

import { HybridSignaling } from "./hybrid-signaling"
import type { WebRTCCallbacks } from "../types"

interface PeerRecord {
  id: string
  pc: RTCPeerConnection
  dc: RTCDataChannel | null
  status: "connecting" | "connected" | "disconnected"
}

export class WebRTCConnectionManager {
  private readonly peerId: string
  private readonly room: string
  private readonly callbacks: WebRTCCallbacks
  private readonly peers = new Map<string, PeerRecord>()
  private readonly signaling: HybridSignaling
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>()

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  }

  constructor(peerId: string, room: string, callbacks: WebRTCCallbacks) {
    this.peerId = peerId
    this.room = room
    this.callbacks = callbacks

    this.signaling = new HybridSignaling(peerId, room, {
      onOffer: this.handleOffer.bind(this),
      onAnswer: this.handleAnswer.bind(this),
      onIceCandidate: this.handleIceCandidate.bind(this),
      onPeerJoined: callbacks.onPeerDiscovered,
      onPeerLeft: this.handlePeerLeft.bind(this),
    })

    console.log(`🔧 WebRTC manager ready – ${peerId}@${room}`)
  }

  async connectToPeer(remotePeerId: string) {
    if (this.peers.has(remotePeerId)) {
      console.log(`Already connected to ${remotePeerId}`)
      return
    }

    console.log(`🤝 Connecting to ${remotePeerId}`)
    this.callbacks.onConnectionStatusChange("connecting")

    const pc = new RTCPeerConnection(this.rtcConfig)
    const dc = pc.createDataChannel("fileTransfer", { ordered: true })
    const peer: PeerRecord = { id: remotePeerId, pc, dc, status: "connecting" }

    this.registerPeer(peer)
    this.setupDataChannel(dc, peer)

    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.signaling.sendOffer(offer, remotePeerId)
      console.log(`📤 Offer sent to ${remotePeerId}`)
    } catch (err) {
      console.error("Failed to create offer:", err)
      this.peers.delete(remotePeerId)
      this.callbacks.onConnectionStatusChange("disconnected")
    }
  }

  sendData(data: any, targetPeerId?: string): boolean {
    const targets = targetPeerId ? [this.peers.get(targetPeerId)] : Array.from(this.peers.values())
    let ok = false

    targets.forEach((p) => {
      if (p?.dc?.readyState === "open") {
        try {
          p.dc.send(JSON.stringify(data))
          ok = true
          console.log(`📤 Data sent to ${p.id}:`, data.type)
        } catch (error) {
          console.error(`Failed to send data to ${p.id}:`, error)
        }
      }
    })
    return ok
  }

  getConnectedPeers(): string[] {
    return Array.from(this.peers.values())
      .filter((p) => p.status === "connected")
      .map((p) => p.id)
  }

  getDiscoveredPeers(): string[] {
    return this.signaling.getDiscoveredPeers()
  }

  getSignalingStatus() {
    return this.signaling.getConnectionStatus()
  }

  cleanup() {
    this.peers.forEach((p) => {
      p.dc?.close()
      p.pc.close()
    })
    this.peers.clear()
    this.signaling.cleanup()
  }

  /* --------------------------------------------------------------------- */
  /*                           Signaling Handlers                           */
  /* --------------------------------------------------------------------- */

  private async handleOffer(offer: RTCSessionDescriptionInit, from: string) {
    if (this.peers.has(from)) {
      console.log(`Already connected to ${from}, ignoring offer`)
      return
    }

    console.log(`📥 Handling offer from ${from}`)
    const pc = new RTCPeerConnection(this.rtcConfig)
    const peer: PeerRecord = { id: from, pc, dc: null, status: "connecting" }

    this.registerPeer(peer)

    try {
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.signaling.sendAnswer(answer, from)
      this.flushCandidates(from)
      console.log(`📤 Answer sent to ${from}`)
    } catch (err) {
      console.error("Error handling offer:", err)
      this.peers.delete(from)
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit, from: string) {
    console.log(`📥 Handling answer from ${from}`)
    const peer = this.peers.get(from)
    if (!peer) {
      console.warn(`No peer found for answer from ${from}`)
      return
    }
    try {
      await peer.pc.setRemoteDescription(answer)
      this.flushCandidates(from)
    } catch (err) {
      console.error("Error handling answer:", err)
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit, from: string) {
    console.log(`🧊 Handling ICE candidate from ${from}`)
    const peer = this.peers.get(from)
    if (!peer || !peer.pc.remoteDescription) {
      if (!this.pendingCandidates.has(from)) this.pendingCandidates.set(from, [])
      this.pendingCandidates.get(from)!.push(candidate)
      return
    }
    try {
      await peer.pc.addIceCandidate(candidate)
    } catch (err) {
      console.warn("Failed to add ICE candidate:", err)
    }
  }

  private handlePeerLeft(peerId: string) {
    const peer = this.peers.get(peerId)
    if (!peer) return
    console.log(`👋 Peer left: ${peerId}`)
    peer.pc.close()
    this.peers.delete(peerId)
    this.callbacks.onPeerDisconnected(peerId)
    if (this.peers.size === 0) this.callbacks.onConnectionStatusChange("disconnected")
  }

  /* --------------------------------------------------------------------- */
  /*                              Internals                                */
  /* --------------------------------------------------------------------- */

  private registerPeer(peer: PeerRecord) {
    this.peers.set(peer.id, peer)

    peer.pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log(`🧊 Sending ICE candidate to ${peer.id}`)
        this.signaling.sendIceCandidate(e.candidate, peer.id)
      }
    }

    peer.pc.onconnectionstatechange = () => {
      const st = peer.pc.connectionState
      console.log(`🔗 Connection state with ${peer.id}: ${st}`)

      if (st === "connected") {
        peer.status = "connected"
        this.callbacks.onPeerConnected(peer.id)
        this.callbacks.onConnectionStatusChange("connected")
      } else if (["failed", "disconnected", "closed"].includes(st)) {
        peer.status = "disconnected"
        this.handlePeerLeft(peer.id)
      }
    }

    peer.pc.ondatachannel = (e) => {
      console.log(`📡 Received data channel from ${peer.id}`)
      peer.dc = e.channel
      this.setupDataChannel(e.channel, peer)
    }
  }

  private setupDataChannel(dc: RTCDataChannel, peer: PeerRecord) {
    dc.onopen = () => console.log(`📡 Data channel opened with ${peer.id}`)
    dc.onclose = () => console.log(`📡 Data channel closed with ${peer.id}`)
    dc.onerror = (err) => console.error("DataChannel error", err)
    dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        console.log(`📨 Data received from ${peer.id}:`, data.type)
        this.callbacks.onDataReceived(data, peer.id)
      } catch (err) {
        console.warn("Invalid JSON from", peer.id)
      }
    }
  }

  private async flushCandidates(peerId: string) {
    const pending = this.pendingCandidates.get(peerId)
    const peer = this.peers.get(peerId)
    if (!pending || !peer) return

    console.log(`Processing ${pending.length} pending ICE candidates for ${peerId}`)
    for (const c of pending) {
      try {
        await peer.pc.addIceCandidate(c)
      } catch (err) {
        console.warn("Error adding queued ICE:", err)
      }
    }
    this.pendingCandidates.delete(peerId)
  }
}
