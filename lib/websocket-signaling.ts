/**
 * WebSocket-based signaling service for cross-machine connections
 * Falls back to a public WebSocket service for demo purposes
 */

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "join-room" | "peer-joined" | "peer-left"
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

export class WebSocketSignaling {
  private peerId: string
  private room: string
  private callbacks: SignalingCallbacks
  private ws: WebSocket | null = null
  private peers: Set<string> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Using a public WebSocket service for demo - replace with your own server
  private readonly wsUrl = "wss://ws.postman-echo.com/raw"

  constructor(peerId: string, room: string, callbacks: SignalingCallbacks) {
    this.peerId = peerId
    this.room = room
    this.callbacks = callbacks
    this.connect()
  }

  private connect() {
    try {
      console.log("🔌 Connecting to WebSocket signaling server...")
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected")
        this.reconnectAttempts = 0
        this.joinRoom()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.warn("Invalid WebSocket message:", error)
        }
      }

      this.ws.onclose = () => {
        console.log("❌ WebSocket disconnected")
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      console.error("Failed to create WebSocket:", error)
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error("❌ Max reconnection attempts reached")
    }
  }

  private handleMessage(msg: SignalingMessage) {
    if (msg.from === this.peerId) return // ignore ourselves
    if (msg.room !== this.room) return // wrong room

    switch (msg.type) {
      case "offer":
        if (msg.to === this.peerId) this.callbacks.onOffer(msg.data, msg.from)
        break

      case "answer":
        if (msg.to === this.peerId) this.callbacks.onAnswer(msg.data, msg.from)
        break

      case "ice-candidate":
        if (msg.to === this.peerId) this.callbacks.onIceCandidate(msg.data, msg.from)
        break

      case "join-room":
        if (!this.peers.has(msg.from)) {
          this.peers.add(msg.from)
          this.callbacks.onPeerJoined(msg.from)
        }
        break

      case "peer-left":
        if (this.peers.delete(msg.from)) {
          this.callbacks.onPeerLeft(msg.from)
        }
        break
    }
  }

  private sendMessage(message: Omit<SignalingMessage, "from" | "room">) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send message")
      return
    }

    const fullMessage: SignalingMessage = {
      ...message,
      from: this.peerId,
      room: this.room,
    }

    this.ws.send(JSON.stringify(fullMessage))
  }

  joinRoom() {
    this.sendMessage({ type: "join-room", data: null })
  }

  sendOffer(offer: RTCSessionDescriptionInit, targetPeerId: string) {
    this.sendMessage({ type: "offer", to: targetPeerId, data: offer })
  }

  sendAnswer(answer: RTCSessionDescriptionInit, targetPeerId: string) {
    this.sendMessage({ type: "answer", to: targetPeerId, data: answer })
  }

  sendIceCandidate(candidate: RTCIceCandidate, targetPeerId: string) {
    const serializedCandidate = {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    }
    this.sendMessage({ type: "ice-candidate", to: targetPeerId, data: serializedCandidate })
  }

  getDiscoveredPeers(): string[] {
    return Array.from(this.peers)
  }

  cleanup() {
    this.sendMessage({ type: "peer-left", data: null })
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
