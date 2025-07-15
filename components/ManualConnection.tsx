"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Link, Copy, Check } from "lucide-react"

interface ManualConnectionProps {
  myPeerId: string
  connectedPeers: string[]
  onConnectToPeer: (peerId: string) => void
}

export const ManualConnection: React.FC<ManualConnectionProps> = ({ myPeerId, connectedPeers, onConnectToPeer }) => {
  const [targetPeerId, setTargetPeerId] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const handleConnect = () => {
    if (targetPeerId.trim() && targetPeerId !== myPeerId) {
      onConnectToPeer(targetPeerId.trim())
      setTargetPeerId("")
    }
  }

  const copyPeerId = async () => {
    try {
      await navigator.clipboard.writeText(myPeerId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy peer ID:", err)
    }
  }

  const isConnected = (peerId: string) => connectedPeers.includes(peerId)
  const isValidPeerId = targetPeerId.trim() && targetPeerId !== myPeerId && !isConnected(targetPeerId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Manual Connection
        </CardTitle>
        <CardDescription>Connect directly to a specific peer using their ID</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Peer ID */}
        <div className="space-y-2">
          <Label>Your Peer ID (share this with others)</Label>
          <div className="flex gap-2">
            <Input value={myPeerId} readOnly className="font-mono text-sm bg-gray-50" />
            <Button size="sm" variant="outline" onClick={copyPeerId} className="shrink-0 bg-transparent">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Share this ID with someone to allow them to connect to you</p>
        </div>

        {/* Connect to Peer */}
        <div className="space-y-2">
          <Label htmlFor="target-peer">Connect to Peer ID</Label>
          <div className="flex gap-2">
            <Input
              id="target-peer"
              placeholder="Enter peer ID to connect..."
              value={targetPeerId}
              onChange={(e) => setTargetPeerId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValidPeerId && handleConnect()}
              className="font-mono text-sm"
            />
            <Button onClick={handleConnect} disabled={!isValidPeerId} size="sm" className="shrink-0">
              Connect
            </Button>
          </div>

          {/* Connection Status Messages */}
          {targetPeerId.trim() && (
            <div className="text-xs">
              {targetPeerId === myPeerId ? (
                <span className="text-yellow-600">⚠️ Cannot connect to yourself</span>
              ) : isConnected(targetPeerId) ? (
                <span className="text-green-600">✅ Already connected to this peer</span>
              ) : targetPeerId.trim() ? (
                <span className="text-blue-600">Ready to connect</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Connected Peers List */}
        {connectedPeers.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Peers</Label>
            <div className="space-y-1">
              {connectedPeers.map((peerId) => (
                <div key={peerId} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                  <code className="text-sm font-mono">{peerId}</code>
                  <Badge variant="default" className="bg-green-600">
                    Connected
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">How to use Manual Connection:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Copy your Peer ID using the copy button</li>
            <li>2. Share it with someone (via chat, email, etc.)</li>
            <li>3. Ask them to paste your ID and click "Connect"</li>
            <li>4. Or paste their Peer ID here to connect to them</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
