"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Globe, Monitor } from "lucide-react"

interface ConnectionStatusProps {
  connectionStatus: "disconnected" | "connecting" | "connected"
  signalingStatus: { local: boolean; remote: boolean }
  connectedPeers: string[]
  discoveredPeers: string[]
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionStatus,
  signalingStatus,
  connectedPeers,
  discoveredPeers,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            {connectionStatus === "connected" ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium">WebRTC</p>
              <p className="text-xs text-gray-600 capitalize">{connectionStatus}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Local</p>
              <Badge variant={signalingStatus.local ? "default" : "secondary"} className="text-xs">
                {signalingStatus.local ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Remote</p>
              <Badge variant={signalingStatus.remote ? "default" : "secondary"} className="text-xs">
                {signalingStatus.remote ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Peers</p>
              <p className="text-xs text-gray-600">
                {connectedPeers.length} connected • {discoveredPeers.length} discovered
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
