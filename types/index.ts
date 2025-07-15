export interface PeerInfo {
  id: string
  status: "connecting" | "connected" | "disconnected"
}

export interface FileTransfer {
  id: string
  fileName: string
  fileSize: number
  progress: number
  status: "pending" | "transferring" | "completed" | "failed"
  direction: "sending" | "receiving"
  peerId: string
  speed: number
  startTime: number
}

export interface FileOffer {
  transferId: string
  fileName: string
  fileSize: number
  fromPeerId: string
}

export interface MessageData {
  type: "test-message" | "file-offer" | "file-accept" | "file-reject" | "file-chunk"
  [key: string]: any
}

export interface WebRTCCallbacks {
  onPeerConnected: (peerId: string) => void
  onPeerDisconnected: (peerId: string) => void
  onDataReceived: (data: MessageData, fromPeerId: string) => void
  onPeerDiscovered: (peerId: string) => void
  onConnectionStatusChange: (status: "disconnected" | "connecting" | "connected") => void
}

export interface FileTransferCallbacks {
  onTransferProgress: (transferId: string, progress: number, speed: number) => void
  onTransferComplete: (transferId: string) => void
  onTransferError: (transferId: string, error: string) => void
  onFileOffer: (offer: FileOffer) => void
}
