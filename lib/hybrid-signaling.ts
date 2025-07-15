/**
 * Hybrid signaling service that uses both BroadcastChannel (local) and WebSocket (remote)
 */

import { SignalingService } from "./signaling"
import { WebSocketSignaling } from "./websocket-signaling"

interface SignalingCallbacks {
  onOffer: (offer: RTCSessionDescriptionInit, fromPeerId: string) => void
  onAnswer: (answer: RTCSessionDescriptionInit, fromPeerId: string) => void
  onIceCandidate: (candidate: RTCIceCandidateInit, fromPeerId: string) => void
  onPeerJoined: (peerId: string) => void
  onPeerLeft: (peerId: string) => void
}

export class HybridSignaling {
  private peerId: string
  private room: string
  private callbacks: SignalingCallbacks
  private localSignaling: SignalingService
  private remoteSignaling: WebSocketSignaling
  private allPeers: Set<string> = new Set()

  constructor(peerId: string, room: string, callbacks: SignalingCallbacks) {
    this.peerId = peerId
    this.room = room
    this.callbacks = callbacks

    // Initialize local signaling (BroadcastChannel)
    this.localSignaling = new SignalingService(peerId, room, {
      onOffer: this.handleOffer.bind(this),
      onAnswer: this.handleAnswer.bind(this),
      onIceCandidate: this.handleIceCandidate.bind(this),
      onPeerJoined: this.handlePeerJoined.bind(this),
      onPeerLeft: this.handlePeerLeft.bind(this),
    })

    // Initialize remote signaling (WebSocket)
    this.remoteSignaling = new WebSocketSignaling(peerId, room, {
      onOffer: this.handleOffer.bind(this),
      onAnswer: this.handleAnswer.bind(this),
      onIceCandidate: this.handleIceCandidate.bind(this),
      onPeerJoined: this.handlePeerJoined.bind(this),
      onPeerLeft: this.handlePeerLeft.bind(this),
    })

    console.log(`🔧 Hybrid signaling initialized for ${peerId}`)
  }

  private handleOffer(offer: RTCSessionDescriptionInit, fromPeerId: string) {
    this.callbacks.onOffer(offer, fromPeerId)
  }

  private handleAnswer(answer: RTCSessionDescriptionInit, fromPeerId: string) {
    this.callbacks.onAnswer(answer, fromPeerId)
  }

  private handleIceCandidate(candidate: RTCIceCandidateInit, fromPeerId: string) {
    this.callbacks.onIceCandidate(candidate, fromPeerId)
  }

  private handlePeerJoined(peerId: string) {
    if (!this.allPeers.has(peerId)) {
      this.allPeers.add(peerId)
      this.callbacks.onPeerJoined(peerId)
    }
  }

  private handlePeerLeft(peerId: string) {
    if (this.allPeers.delete(peerId)) {
      this.callbacks.onPeerLeft(peerId)
    }
  }

  sendOffer(offer: RTCSessionDescriptionInit, targetPeerId: string) {
    // Send through both channels to ensure delivery
    this.localSignaling.sendOffer(offer, targetPeerId)
    this.remoteSignaling.sendOffer(offer, targetPeerId)
  }

  sendAnswer(answer: RTCSessionDescriptionInit, targetPeerId: string) {
    this.localSignaling.sendAnswer(answer, targetPeerId)
    this.remoteSignaling.sendAnswer(answer, targetPeerId)
  }

  sendIceCandidate(candidate: RTCIceCandidate, targetPeerId: string) {
    this.localSignaling.sendIceCandidate(candidate, targetPeerId)
    this.remoteSignaling.sendIceCandidate(candidate, targetPeerId)
  }

  getDiscoveredPeers(): string[] {
    return Array.from(this.allPeers)
  }

  cleanup() {
    this.localSignaling.cleanup()
    this.remoteSignaling.cleanup()
  }

  getConnectionStatus(): { local: boolean; remote: boolean } {
    return {
      local: true, // BroadcastChannel is always "connected"
      remote: this.remoteSignaling.isConnected(),
    }
  }
}
