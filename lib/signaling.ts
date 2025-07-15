interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "join-room" | "peer-left"
  from: string
  to?: string
  data: any
  room: string
}

interface SignalingCallbacks {
  onOffer: (offer: RTCSessionDescriptionInit, fromPeerId: string) => void
  onAnswer: (answer: RTCSessionDescriptionInit, fromPeerId: string) => void
  onIceCandidate: (candidate: RTCIceCandidateInit, fromPeerId: string) => void
  onPeerJoined: (peerId: string) => void
  onPeerLeft: (peerId: string) => void
}

export class SignalingService {
  private peerId: string
  private room: string
  private callbacks: SignalingCallbacks
  private broadcastChannel: BroadcastChannel
  private discoveredPeers: Set<string> = new Set()

  constructor(peerId: string, room: string, callbacks: SignalingCallbacks) {
    this.peerId = peerId
    this.room = room
    this.callbacks = callbacks
    this.broadcastChannel = new BroadcastChannel(`webrtc-room-${room}`)
    this.broadcastChannel.onmessage = this.handleMessage.bind(this)
    this.announcePresence()
  }

  private handleMessage(event: MessageEvent): void {
    const message: SignalingMessage = event.data

    if (message.from === this.peerId || message.room !== this.room) {
      return
    }

    switch (message.type) {
      case "offer":
        if (message.to === this.peerId) {
          this.callbacks.onOffer(message.data, message.from)
        }
        break
      case "answer":
        if (message.to === this.peerId) {
          this.callbacks.onAnswer(message.data, message.from)
        }
        break
      case "ice-candidate":
        if (message.to === this.peerId) {
          this.callbacks.onIceCandidate(message.data, message.from)
        }
        break
      case "join-room":
        if (!this.discoveredPeers.has(message.from)) {
          this.discoveredPeers.add(message.from)
          this.callbacks.onPeerJoined(message.from)
        }
        break
      case "peer-left":
        if (this.discoveredPeers.delete(message.from)) {
          this.callbacks.onPeerLeft(message.from)
        }
        break
    }
  }

  private sendMessage(message: Omit<SignalingMessage, "from" | "room">): void {
    const fullMessage: SignalingMessage = {
      ...message,
      from: this.peerId,
      room: this.room,
    }
    this.broadcastChannel.postMessage(fullMessage)
  }

  announcePresence(): void {
    this.sendMessage({ type: "join-room", data: null })
  }

  sendOffer(offer: RTCSessionDescriptionInit, targetPeerId: string): void {
    this.sendMessage({ type: "offer", to: targetPeerId, data: offer })
  }

  sendAnswer(answer: RTCSessionDescriptionInit, targetPeerId: string): void {
    this.sendMessage({ type: "answer", to: targetPeerId, data: answer })
  }

  sendIceCandidate(candidate: RTCIceCandidate, targetPeerId: string): void {
    const serializedCandidate = {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    }
    this.sendMessage({ type: "ice-candidate", to: targetPeerId, data: serializedCandidate })
  }

  getDiscoveredPeers(): string[] {
    return Array.from(this.discoveredPeers)
  }

  cleanup(): void {
    this.sendMessage({ type: "peer-left", data: null })
    this.broadcastChannel.close()
  }
}
