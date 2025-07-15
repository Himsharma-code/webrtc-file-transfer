"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

interface PeerListProps {
  discoveredPeers: string[]
  connectedPeers: string[]
  onConnectToPeer: (peerId: string) => void
}

export const PeerList: React.FC<PeerListProps> = ({ discoveredPeers, connectedPeers, onConnectToPeer }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Available Peers
        </CardTitle>
        <CardDescription>Open this page in another tab to discover peers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {discoveredPeers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No peers found</p>
            <p className="text-xs mt-1">Open this page in another browser tab</p>
          </div>
        ) : (
          discoveredPeers.map((peer) => {
            const isConnected = connectedPeers.includes(peer)
            return (
              <div key={peer} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
                  <code className="text-sm font-mono">{peer}</code>
                </div>
                {isConnected ? (
                  <Badge variant="default">Connected</Badge>
                ) : (
                  <Button size="sm" onClick={() => onConnectToPeer(peer)}>
                    Connect
                  </Button>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
