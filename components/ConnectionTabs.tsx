"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Link } from "lucide-react"
import { PeerList } from "./PeerList"
import { ManualConnection } from "./ManualConnection"

interface ConnectionTabsProps {
  myPeerId: string
  discoveredPeers: string[]
  connectedPeers: string[]
  onConnectToPeer: (peerId: string) => void
}

export const ConnectionTabs: React.FC<ConnectionTabsProps> = ({
  myPeerId,
  discoveredPeers,
  connectedPeers,
  onConnectToPeer,
}) => {
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto")

  return (
    <div className="space-y-4">
      {/* Tab Buttons */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "auto" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("auto")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Auto Discovery
            </Button>
            <Button
              variant={activeTab === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("manual")}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              Manual Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === "auto" ? (
        <PeerList discoveredPeers={discoveredPeers} connectedPeers={connectedPeers} onConnectToPeer={onConnectToPeer} />
      ) : (
        <ManualConnection myPeerId={myPeerId} connectedPeers={connectedPeers} onConnectToPeer={onConnectToPeer} />
      )}
    </div>
  )
}
