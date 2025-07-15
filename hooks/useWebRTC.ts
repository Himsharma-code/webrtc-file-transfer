"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { WebRTCConnectionManager } from "../lib/webrtc-connection"
import { FileTransferService } from "../lib/file-transfer"
import type { FileTransfer, FileOffer, MessageData } from "../types"
import { generateId } from "../utils/format"

export const useWebRTC = (peerId: string, room: string) => {
  const [discoveredPeers, setDiscoveredPeers] = useState<string[]>([])
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [signalingStatus, setSignalingStatus] = useState<{ local: boolean; remote: boolean }>({
    local: false,
    remote: false,
  })
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([])
  const [pendingOffers, setPendingOffers] = useState<FileOffer[]>([])
  const [messages, setMessages] = useState<string[]>([])

  const webrtcManager = useRef<WebRTCConnectionManager | null>(null)
  const fileTransferService = useRef<FileTransferService | null>(null)
  const transferFiles = useRef<Map<string, File>>(new Map())

  const addMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMessages((prev) => [...prev.slice(-19), `${timestamp}: ${message}`])
    console.log("📝", message)
  }, [])

  // Check signaling status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (webrtcManager.current) {
        const status = webrtcManager.current.getSignalingStatus()
        setSignalingStatus(status)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const initializeServices = useCallback(() => {
    // Initialize file transfer service
    fileTransferService.current = new FileTransferService({
      onTransferProgress: (transferId, progress, speed) => {
        setFileTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? { ...t, progress, speed, status: "transferring" } : t)),
        )
      },
      onTransferComplete: (transferId) => {
        setFileTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? { ...t, status: "completed", progress: 100 } : t)),
        )
        addMessage(`✅ File transfer completed: ${transferId}`)
        transferFiles.current.delete(transferId)
      },
      onTransferError: (transferId, error) => {
        setFileTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, status: "failed" } : t)))
        addMessage(`❌ File transfer error: ${error}`)
        transferFiles.current.delete(transferId)
      },
      onFileOffer: (offer) => {
        setPendingOffers((prev) => [...prev, offer])
        addMessage(`📥 File offer received: ${offer.fileName} from ${offer.fromPeerId}`)
      },
    })

    // Initialize WebRTC connection manager
    webrtcManager.current = new WebRTCConnectionManager(peerId, room, {
      onPeerConnected: (peerId) => {
        setConnectedPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]))
        addMessage(`✅ Connected to ${peerId}`)
      },
      onPeerDisconnected: (peerId) => {
        setConnectedPeers((prev) => prev.filter((id) => id !== peerId))
        addMessage(`❌ Disconnected from ${peerId}`)
      },
      onDataReceived: (data: MessageData, fromPeerId: string) => {
        handleDataReceived(data, fromPeerId)
      },
      onPeerDiscovered: (peerId) => {
        setDiscoveredPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]))
        addMessage(`👋 Discovered peer: ${peerId}`)
      },
      onConnectionStatusChange: setConnectionStatus,
    })

    addMessage(`🚀 Initialized as ${peerId} in room ${room}`)
    addMessage(`🌐 Hybrid signaling: Local (BroadcastChannel) + Remote (WebSocket)`)
  }, [peerId, room, addMessage])

  const handleDataReceived = useCallback(
    (data: MessageData, fromPeerId: string) => {
      console.log("📨 Data received:", data.type, "from:", fromPeerId)

      switch (data.type) {
        case "test-message":
          addMessage(`💬 ${fromPeerId}: ${data.text}`)
          break
        case "file-offer":
          fileTransferService.current?.handleFileOffer(data, fromPeerId)
          break
        case "file-accept":
          handleFileAccept(data.transferId, fromPeerId)
          break
        case "file-reject":
          handleFileReject(data.transferId, fromPeerId)
          break
        case "file-chunk":
          fileTransferService.current?.handleFileChunk(data)
          break
      }
    },
    [addMessage],
  )

  const handleFileAccept = useCallback(
    async (transferId: string, fromPeerId: string) => {
      if (!webrtcManager.current || !fileTransferService.current) {
        addMessage(`❌ Cannot start transfer: missing services`)
        return
      }

      const file = transferFiles.current.get(transferId)
      if (!file) {
        addMessage(`❌ Cannot find file for transfer ${transferId}`)
        console.error("Available transfer files:", Array.from(transferFiles.current.keys()))
        return
      }

      addMessage(`✅ File transfer accepted by ${fromPeerId} - starting transfer of ${file.name}`)
      setFileTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, status: "transferring" } : t)))

      try {
        const mockPeerConnection = {
          dataChannel: {
            readyState: "open",
            send: (data: string) => {
              const parsedData = JSON.parse(data)
              webrtcManager.current?.sendData(parsedData, fromPeerId)
            },
          },
        }

        await fileTransferService.current.sendFile(file, mockPeerConnection, transferId)
      } catch (error) {
        addMessage(`❌ File transfer failed: ${error}`)
        setFileTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, status: "failed" } : t)))
      }
    },
    [addMessage],
  )

  const handleFileReject = useCallback(
    (transferId: string, fromPeerId: string) => {
      addMessage(`❌ File transfer rejected by ${fromPeerId}`)
      setFileTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, status: "failed" } : t)))
      transferFiles.current.delete(transferId)
    },
    [addMessage],
  )

  const connectToPeer = useCallback(
    async (targetPeerId: string) => {
      if (!webrtcManager.current) return

      try {
        addMessage(`🔄 Connecting to ${targetPeerId}...`)
        await webrtcManager.current.connectToPeer(targetPeerId)
      } catch (error) {
        addMessage(`❌ Failed to connect to ${targetPeerId}: ${error}`)
      }
    },
    [addMessage],
  )

  const sendMessage = useCallback(
    (text: string): boolean => {
      if (!webrtcManager.current || connectedPeers.length === 0) return false

      const success = webrtcManager.current.sendData({ type: "test-message", text })
      if (success) {
        addMessage(`📤 Sent message: ${text}`)
      }
      return success
    },
    [webrtcManager, connectedPeers, addMessage],
  )

  const sendFileOffer = useCallback(
    (file: File): boolean => {
      if (!webrtcManager.current || connectedPeers.length === 0) return false

      const transferId = generateId("transfer")
      const targetPeer = connectedPeers[0]

      transferFiles.current.set(transferId, file)
      console.log(`📁 Stored file ${file.name} for transfer ${transferId}`)

      const success = webrtcManager.current.sendData(
        {
          type: "file-offer",
          transferId,
          fileName: file.name,
          fileSize: file.size,
        },
        targetPeer,
      )

      if (success) {
        const transfer: FileTransfer = {
          id: transferId,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: "pending",
          direction: "sending",
          peerId: targetPeer,
          speed: 0,
          startTime: Date.now(),
        }
        setFileTransfers((prev) => [...prev, transfer])
        addMessage(`📤 File offer sent: ${file.name} (ID: ${transferId})`)
      } else {
        transferFiles.current.delete(transferId)
      }

      return success
    },
    [webrtcManager, connectedPeers, addMessage],
  )

  const acceptFileOffer = useCallback(
    (offer: FileOffer) => {
      if (!webrtcManager.current) return

      webrtcManager.current.sendData(
        {
          type: "file-accept",
          transferId: offer.transferId,
        },
        offer.fromPeerId,
      )

      const transfer: FileTransfer = {
        id: offer.transferId,
        fileName: offer.fileName,
        fileSize: offer.fileSize,
        progress: 0,
        status: "transferring",
        direction: "receiving",
        peerId: offer.fromPeerId,
        speed: 0,
        startTime: Date.now(),
      }

      setFileTransfers((prev) => [...prev, transfer])
      setPendingOffers((prev) => prev.filter((o) => o.transferId !== offer.transferId))
      addMessage(`✅ Accepted file: ${offer.fileName}`)
    },
    [webrtcManager, addMessage],
  )

  const rejectFileOffer = useCallback(
    (offer: FileOffer) => {
      if (!webrtcManager.current) return

      webrtcManager.current.sendData(
        {
          type: "file-reject",
          transferId: offer.transferId,
        },
        offer.fromPeerId,
      )

      setPendingOffers((prev) => prev.filter((o) => o.transferId !== offer.transferId))
      addMessage(`❌ Rejected file: ${offer.fileName}`)
    },
    [webrtcManager, addMessage],
  )

  const cleanup = useCallback(() => {
    webrtcManager.current?.cleanup()
    transferFiles.current.clear()
  }, [])

  return {
    // State
    discoveredPeers,
    connectedPeers,
    connectionStatus,
    signalingStatus,
    fileTransfers,
    pendingOffers,
    messages,

    // Actions
    initializeServices,
    connectToPeer,
    sendMessage,
    sendFileOffer,
    acceptFileOffer,
    rejectFileOffer,
    cleanup,
  }
}
