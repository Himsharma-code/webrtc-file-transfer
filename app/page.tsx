"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Send, FileText, Download, AlertCircle, Check, X } from "lucide-react"
import { useWebRTC } from "../hooks/useWebRTC"
import { ConnectionTabs } from "../components/ConnectionTabs"
import { ConnectionStatus } from "../components/ConnectionStatus"
import { FileTransferList } from "../components/FileTransferList"
import { formatFileSize, generateId } from "../utils/format"

export default function WebRTCFileTransfer() {
  const [peerId] = useState<string>(() => generateId("peer"))
  const [room] = useState<string>("default-room")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [testMessage, setTestMessage] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    discoveredPeers,
    connectedPeers,
    connectionStatus,
    signalingStatus,
    fileTransfers,
    pendingOffers,
    messages,
    initializeServices,
    connectToPeer,
    sendMessage,
    sendFileOffer,
    acceptFileOffer,
    rejectFileOffer,
    cleanup,
  } = useWebRTC(peerId, room)

  useEffect(() => {
    initializeServices()
    return cleanup
  }, [initializeServices, cleanup])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      console.log(`📁 File selected: ${file.name} (${file.size} bytes)`)
    }
  }

  const handleSendFile = () => {
    if (selectedFile) {
      console.log(`📤 Attempting to send file: ${selectedFile.name}`)
      const success = sendFileOffer(selectedFile)
      if (!success) {
        console.error("❌ Failed to send file offer")
      }
    }
  }

  const handleSendMessage = () => {
    if (testMessage.trim()) {
      sendMessage(testMessage)
      setTestMessage("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">WebRTC File Transfer</h1>
          <p className="text-gray-600">Cross-machine peer-to-peer file sharing with hybrid signaling</p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus
          connectionStatus={connectionStatus}
          signalingStatus={signalingStatus}
          connectedPeers={connectedPeers}
          discoveredPeers={discoveredPeers}
        />

        {/* Debug Info */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="text-sm space-y-1">
              <div>
                <strong>Your Peer ID:</strong> <code className="bg-white px-2 py-1 rounded">{peerId}</code>
              </div>
              <div>
                <strong>Room:</strong> <code>{room}</code>
              </div>
              <div>
                <strong>Signaling:</strong>
                <span className="ml-2">
                  Local:{" "}
                  <span className={signalingStatus.local ? "text-green-600" : "text-red-600"}>
                    {signalingStatus.local ? "✓" : "✗"}
                  </span>
                </span>
                <span className="ml-4">
                  Remote:{" "}
                  <span className={signalingStatus.remote ? "text-green-600" : "text-red-600"}>
                    {signalingStatus.remote ? "✓" : "✗"}
                  </span>
                </span>
              </div>
              <div>
                <strong>File Selected:</strong>{" "}
                {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "None"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending File Offers */}
        {pendingOffers.length > 0 && (
          <div className="space-y-3">
            {pendingOffers.map((offer) => (
              <Alert key={offer.transferId} className="border-blue-200 bg-blue-50">
                <Download className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <strong>{offer.fromPeerId}</strong> wants to send you <strong>{offer.fileName}</strong> (
                    {formatFileSize(offer.fileSize)})
                    <br />
                    <code className="text-xs">Transfer ID: {offer.transferId}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptFileOffer(offer)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectFileOffer(offer)}>
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Connection Methods */}
            <ConnectionTabs
              myPeerId={peerId}
              discoveredPeers={discoveredPeers}
              connectedPeers={connectedPeers}
              onConnectToPeer={connectToPeer}
            />

            {/* Test Messages */}
            {connectedPeers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Test Connection
                  </CardTitle>
                  <CardDescription>Send a test message to verify the connection works</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a test message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!testMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Send File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-input">Choose File</Label>
                  <Input
                    id="file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {selectedFile && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">Size: {formatFileSize(selectedFile.size)}</div>
                  </div>
                )}

                <Button
                  onClick={handleSendFile}
                  disabled={!selectedFile || connectedPeers.length === 0}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {connectedPeers.length === 0 ? "No Connected Peers" : "Send File"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <FileTransferList fileTransfers={fileTransfers} />

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded-lg max-h-80 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity yet...</p>
                  ) : (
                    <div className="space-y-1">
                      {messages.map((message, index) => (
                        <div key={index} className="text-xs font-mono break-all">
                          {message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Cross-Machine Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-blue-700">🌐 For Different Machines/Browsers</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <p>Use the Manual Connection tab</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <p>Copy your Peer ID and share it</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <p>Enter their Peer ID to connect</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <p>Wait for Remote signaling to connect</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-green-700">🖥️ For Same Machine/Browser</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <p>Use Auto Discovery tab</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <p>Open multiple browser tabs</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <p>Peers auto-discover via Local signaling</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
